"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { computeCartTotals, type CartTotals } from "@/lib/cart-math";
import type { CartItem, Product } from "@/lib/types";

const STORAGE_KEY = "mela-stall-cart";

type CartState = {
  items: CartItem[];
  discountAmount: number;
  discountPercent: number;
};

type AddProductResult =
  | { ok: true; added: number; limited?: boolean }
  | { ok: false; reason: "out_of_stock"; available: 0 };

type CartContextValue = CartState & {
  totals: CartTotals;
  itemCount: number;
  addProduct: (product: Product, qty?: number) => AddProductResult;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setDiscounts: (amount: number, percent: number) => void;
  getCartQty: (productId: string) => number;
  availableStock: (product: Pick<Product, "id" | "stock">) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

const emptyState: CartState = {
  items: [],
  discountAmount: 0,
  discountPercent: 0,
};

function productToItem(product: Product, qty: number): CartItem {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    sellPrice: Number(product.sell_price),
    costPrice: Number(product.cost_price),
    expensePercent: Number(product.expense_percent) || 0,
    discountPercent: Number(product.discount_percent) || 0,
    qty,
    stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
  };
}

function normalizeItem(raw: Partial<CartItem>): CartItem | null {
  if (!raw.productId || !raw.name || !raw.sku) return null;
  const qty = Math.max(0, Math.floor(Number(raw.qty) || 0));
  if (qty <= 0) return null;
  const hasStock = typeof raw.stock === "number" && Number.isFinite(raw.stock);
  // Legacy carts without stock: keep qty, treat as uncapped until re-added.
  const stock = hasStock
    ? Math.max(0, Math.floor(raw.stock as number))
    : Math.max(qty, 999999);
  const clampedQty = Math.min(qty, stock);
  return {
    productId: String(raw.productId),
    name: String(raw.name),
    sku: String(raw.sku),
    sellPrice: Number(raw.sellPrice) || 0,
    costPrice: Number(raw.costPrice) || 0,
    expensePercent: Number(raw.expensePercent) || 0,
    discountPercent: Number(raw.discountPercent) || 0,
    qty: clampedQty,
    stock,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        const items = (parsed.items ?? [])
          .map((item) => normalizeItem(item))
          .filter((item): item is CartItem => item !== null);
        setState({
          items,
          discountAmount: Number(parsed.discountAmount) || 0,
          discountPercent: Number(parsed.discountPercent) || 0,
        });
      }
    } catch {
      setState(emptyState);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const getCartQty = useCallback(
    (productId: string) =>
      state.items.find((item) => item.productId === productId)?.qty ?? 0,
    [state.items],
  );

  const availableStock = useCallback(
    (product: Pick<Product, "id" | "stock">) => {
      const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
      return Math.max(0, stock - getCartQty(product.id));
    },
    [getCartQty],
  );

  const addProduct = useCallback((product: Product, qty = 1): AddProductResult => {
    const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
    const want = Math.max(1, Math.floor(qty));
    let result: AddProductResult = { ok: false, reason: "out_of_stock", available: 0 };

    setState((prev) => {
      const existing = prev.items.find((item) => item.productId === product.id);
      const inCart = existing?.qty ?? 0;
      const room = Math.max(0, stock - inCart);

      if (stock <= 0 || room <= 0) {
        result = { ok: false, reason: "out_of_stock", available: 0 };
        return prev;
      }

      const added = Math.min(want, room);
      if (added <= 0) {
        result = { ok: false, reason: "out_of_stock", available: 0 };
        return prev;
      }

      result = { ok: true, added, limited: added < want };

      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  qty: item.qty + added,
                  stock,
                  sellPrice: Number(product.sell_price),
                  costPrice: Number(product.cost_price),
                  expensePercent: Number(product.expense_percent) || 0,
                  discountPercent: Number(product.discount_percent) || 0,
                }
              : item,
          ),
        };
      }

      return {
        ...prev,
        items: [...prev.items, productToItem(product, added)],
      };
    });

    return result;
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setState((prev) => {
      const existing = prev.items.find((item) => item.productId === productId);
      if (!existing) return prev;

      if (qty <= 0) {
        return {
          ...prev,
          items: prev.items.filter((item) => item.productId !== productId),
        };
      }

      const max = Math.max(0, Math.floor(Number(existing.stock) || 0));
      const nextQty = max > 0 ? Math.min(Math.floor(qty), max) : Math.floor(qty);
      if (nextQty <= 0) {
        return {
          ...prev,
          items: prev.items.filter((item) => item.productId !== productId),
        };
      }

      return {
        ...prev,
        items: prev.items.map((item) =>
          item.productId === productId ? { ...item, qty: nextQty } : item,
        ),
      };
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.productId !== productId),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState(emptyState);
  }, []);

  const setDiscounts = useCallback((amount: number, percent: number) => {
    setState((prev) => ({
      ...prev,
      discountAmount: Math.max(0, amount),
      discountPercent: Math.min(100, Math.max(0, percent)),
    }));
  }, []);

  const totals = useMemo(
    () => computeCartTotals(state.items, state.discountAmount, state.discountPercent),
    [state.items, state.discountAmount, state.discountPercent],
  );

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.qty, 0),
    [state.items],
  );

  const value = useMemo(
    () => ({
      ...state,
      totals,
      itemCount,
      addProduct,
      setQty,
      removeItem,
      clearCart,
      setDiscounts,
      getCartQty,
      availableStock,
    }),
    [
      state,
      totals,
      itemCount,
      addProduct,
      setQty,
      removeItem,
      clearCart,
      setDiscounts,
      getCartQty,
      availableStock,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
