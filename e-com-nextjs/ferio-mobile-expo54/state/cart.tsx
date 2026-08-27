import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "@/types/catalog";

type CartItem = Pick<CatalogProduct, "id" | "slug" | "name" | "variantId" | "price" | "image" | "availableStock"> & { quantity: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: CatalogProduct) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ferio_mobile_cart_v1";

export function CartProvider({ children }: React.PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setItems(JSON.parse(raw));
    }).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((n, item) => n + item.quantity, 0),
    subtotal: items.reduce((n, item) => n + item.price * item.quantity, 0),
    add(product) {
      setItems((current) => {
        const found = current.find((item) => item.variantId === product.variantId);
        if (found) return current.map((item) => item.variantId === product.variantId ? { ...item, quantity: Math.min(item.quantity + 1, product.availableStock) } : item);
        return [...current, { id: product.id, slug: product.slug, name: product.name, variantId: product.variantId, price: product.price, image: product.image, availableStock: product.availableStock, quantity: 1 }];
      });
    },
    updateQuantity(variantId, quantity) {
      setItems((current) => current.map((item) => item.variantId === variantId ? { ...item, quantity: Math.max(1, Math.min(quantity, item.availableStock)) } : item));
    },
    remove(variantId) { setItems((current) => current.filter((item) => item.variantId !== variantId)); },
    clear() { setItems([]); },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
