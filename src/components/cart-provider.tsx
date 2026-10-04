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

type CartContextValue = CartState & {
  totals: CartTotals;
  itemCount: number;
  addProduct: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setDiscounts: (amount: number, percent: number) => void;
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
    qty,
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
        setState({
          items: parsed.items ?? [],
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

  const addProduct = useCallback((product: Product, qty = 1) => {
    setState((prev) => {
      const existing = prev.items.find((item) => item.productId === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.productId === product.id
              ? { ...item, qty: item.qty + qty }
              : item,
          ),
        };
      }
      return {
        ...prev,
        items: [...prev.items, productToItem(product, qty)],
      };
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setState((prev) => ({
      ...prev,
      items:
        qty <= 0
          ? prev.items.filter((item) => item.productId !== productId)
          : prev.items.map((item) =>
              item.productId === productId ? { ...item, qty } : item,
            ),
    }));
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
