export type CartIssue = {
  code: string;
  message: string;
  severity: "warning" | "blocking";
};

export type CartLine = {
  id: string;
  productId: string;
  variantId: string;
  slug: string;
  productName: string;
  variantName: string;
  sku: string;
  codAvailable: boolean;
  image: string | null;
  quantity: number;
  addedUnitPrice: number;
  currentUnitPrice: number;
  lineTotal: number;
  availableStock: number;
  issues: CartIssue[];
};

export type CartState = {
  id: string | null;
  items: CartLine[];
  subtotal: number;
  itemCount: number;
  isValid: boolean;
  expiresAt: string | null;
};

export const emptyCart: CartState = {
  id: null,
  items: [],
  subtotal: 0,
  itemCount: 0,
  isValid: true,
  expiresAt: null,
};
