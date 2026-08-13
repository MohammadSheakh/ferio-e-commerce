"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CartState, emptyCart } from "@/lib/cart";

type CartContextType = {
  cart: CartState;
  lines: CartState["items"];
  subtotal: number;
  count: number;
  loading: boolean;
  error: string;
  add: (variantId: string, quantity?: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
  setQty: (variantId: string, quantity: number) => Promise<void>;
  replaceVariant: (
    variantId: string,
    replacementVariantId: string,
    quantity: number,
  ) => Promise<void>;
  revalidate: () => Promise<CartState>;
  clearError: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(emptyCart);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestCart = useCallback(
    async (path: string, init?: RequestInit): Promise<CartState> => {
      setError("");
      const response = await fetch(path, {
        ...init,
        headers: {
          Accept: "application/json",
          ...init?.headers,
        },
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: CartState;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        const message = payload.message || "Unable to update your cart.";
        setError(message);
        throw new Error(message);
      }
      setCart(payload.data);
      return payload.data;
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      await requestCart("/api/cart");
    } catch {
      setCart(emptyCart);
    } finally {
      setLoading(false);
    }
  }, [requestCart]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function add(variantId: string, quantity = 1) {
    await requestCart("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity }),
    });
  }

  async function remove(variantId: string) {
    await requestCart(`/api/cart/items/${variantId}`, { method: "DELETE" });
  }

  async function setQty(variantId: string, quantity: number) {
    await requestCart(`/api/cart/items/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
  }

  async function replaceVariant(
    variantId: string,
    replacementVariantId: string,
    quantity: number,
  ) {
    await requestCart(`/api/cart/items/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, replacementVariantId }),
    });
  }

  async function revalidate() {
    return requestCart("/api/cart/validate", { method: "POST" });
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        lines: cart.items,
        subtotal: cart.subtotal,
        count: cart.itemCount,
        loading,
        error,
        add,
        remove,
        setQty,
        replaceVariant,
        revalidate,
        clearError: () => setError(""),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
