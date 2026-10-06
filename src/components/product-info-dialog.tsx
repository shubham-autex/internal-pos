"use client";

import Link from "next/link";
import { Sheet } from "@/components/sheet";
import {
  expenseAmount,
  floorPercent,
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
  const discountPct = floorPercent(product.discount_percent);
  const expense = expenseAmount(cost, expensePct);
  const profit = unitProfit(sell, cost, expensePct, discountPct);
  const margin = marginPercent(sell, cost, expensePct, discountPct);
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  const isCombo = product.kind === "combo";
  const components = product.components ?? [];

  return (
    <Sheet open onClose={onClose} title={product.name} size="md">
      <p className="text-sm text-[var(--ink-muted)]">
        SKU {product.sku}
        {isCombo ? " · Combo" : ""}
      </p>
      {product.description ? (
        <p className="mt-3 text-sm">{product.description}</p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">Sell</dt>
          <dd className="text-xl font-semibold">{formatINR(sell)}</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">
            Cost{isCombo ? " (from items)" : ""}
          </dt>
          <dd className="text-xl font-semibold">{formatINR(cost)}</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">Discount</dt>
          <dd className="text-xl font-semibold">{discountPct}%</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">
            Expense{isCombo ? " (from items)" : ""}
          </dt>
          <dd className="text-xl font-semibold">{expensePct}%</dd>
          <dd className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {formatINR(expense)} of cost
          </dd>
        </div>
        <div className="rounded-xl bg-[var(--accent-soft)] p-3">
          <dt className="text-[var(--ink-muted)]">Profit %</dt>
          <dd className="text-xl font-semibold">{margin}%</dd>
        </div>
        <div className="rounded-xl bg-[var(--accent-soft)] p-3">
          <dt className="text-[var(--ink-muted)]">Unit profit</dt>
          <dd className="text-xl font-semibold">{formatINR(profit)}</dd>
          <dd className="mt-0.5 text-xs text-[var(--ink-muted)]">
            After discount % & expense
          </dd>
        </div>
        <div className="col-span-2 rounded-xl border border-[var(--line)] p-3">
          <dt className="text-[var(--ink-muted)]">
            {isCombo ? "Buildable stock" : "Stock left"}
          </dt>
          <dd
            className={`text-xl font-semibold ${
              stock <= 0 ? "text-red-700" : ""
            }`}
          >
            {stock <= 0 ? "Out of stock" : stock}
          </dd>
        </div>
      </dl>

      {isCombo && components.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-[var(--line)] p-3">
          <p className="text-sm font-semibold">Includes</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {components.map((component) => (
              <li
                key={component.component_id}
                className="flex justify-between gap-2"
              >
                <span className="truncate">
                  {component.quantity}× {component.name ?? "Item"}
                </span>
                <span className="shrink-0 text-[var(--ink-muted)]">
                  {component.sku}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href={`/products/${product.id}`}
        className="mt-4 block rounded-xl border border-[var(--line)] px-4 py-3 text-center text-sm font-semibold"
      >
        Edit {isCombo ? "combo" : "product"}
      </Link>
    </Sheet>
  );
}
