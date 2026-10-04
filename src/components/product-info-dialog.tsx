"use client";

import Link from "next/link";
import { Sheet } from "@/components/sheet";
import {
  expenseAmount,
  formatINR,
  marginPercent,
  unitProfit,
} from "@/lib/money";
import type { Product } from "@/lib/types";

type ProductInfoDialogProps = {
  product: Product;
  onClose: () => void;
};

export function ProductInfoDialog({ product, onClose }: ProductInfoDialogProps) {
  const sell = Number(product.sell_price);
  const cost = Number(product.cost_price);
  const expensePct = Number(product.expense_percent) || 0;
  const expense = expenseAmount(sell, expensePct);
  const profit = unitProfit(sell, cost, expensePct);
  const margin = marginPercent(sell, cost, expensePct);
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));

  return (
    <Sheet open onClose={onClose} title={product.name} size="md">
      <p className="text-sm text-[var(--ink-muted)]">SKU {product.sku}</p>
      {product.description ? (
        <p className="mt-3 text-sm">{product.description}</p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">Sell</dt>
          <dd className="text-xl font-semibold">{formatINR(sell)}</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">Cost</dt>
          <dd className="text-xl font-semibold">{formatINR(cost)}</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">Expense</dt>
          <dd className="text-xl font-semibold">{expensePct}%</dd>
          <dd className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {formatINR(expense)} of sell
          </dd>
        </div>
        <div className="rounded-xl bg-[var(--accent-soft)] p-3">
          <dt className="text-[var(--ink-muted)]">Margin</dt>
          <dd className="text-xl font-semibold">{margin}%</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-[var(--accent-soft)] p-3">
          <dt className="text-[var(--ink-muted)]">Unit profit</dt>
          <dd className="text-xl font-semibold">{formatINR(profit)}</dd>
          <dd className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Sell − cost − expense
          </dd>
        </div>
        <div className="col-span-2 rounded-xl border border-[var(--line)] p-3">
          <dt className="text-[var(--ink-muted)]">Stock left</dt>
          <dd
            className={`text-xl font-semibold ${
              stock <= 0 ? "text-red-700" : ""
            }`}
          >
            {stock <= 0 ? "Out of stock" : stock}
          </dd>
        </div>
      </dl>

      <Link
        href={`/products/${product.id}`}
        className="mt-4 block rounded-xl border border-[var(--line)] px-4 py-3 text-center text-sm font-semibold"
      >
        Edit product
      </Link>
    </Sheet>
  );
}
