"use client";

import { Sheet } from "@/components/sheet";
import { formatINR, marginPercent, unitProfit } from "@/lib/money";
import type { Product } from "@/lib/types";

type ProductInfoDialogProps = {
  product: Product;
  onClose: () => void;
};

export function ProductInfoDialog({ product, onClose }: ProductInfoDialogProps) {
  const profit = unitProfit(Number(product.sell_price), Number(product.cost_price));
  const margin = marginPercent(
    Number(product.sell_price),
    Number(product.cost_price),
  );

  return (
    <Sheet open onClose={onClose} title={product.name} size="md">
      <p className="text-sm text-[var(--ink-muted)]">SKU {product.sku}</p>
      {product.description ? (
        <p className="mt-3 text-sm">{product.description}</p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">Sell</dt>
          <dd className="text-xl font-semibold">
            {formatINR(Number(product.sell_price))}
          </dd>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <dt className="text-[var(--ink-muted)]">Cost</dt>
          <dd className="text-xl font-semibold">
            {formatINR(Number(product.cost_price))}
          </dd>
        </div>
        <div className="rounded-xl bg-[var(--accent-soft)] p-3">
          <dt className="text-[var(--ink-muted)]">Unit profit</dt>
          <dd className="text-xl font-semibold">{formatINR(profit)}</dd>
        </div>
        <div className="rounded-xl bg-[var(--accent-soft)] p-3">
          <dt className="text-[var(--ink-muted)]">Margin</dt>
          <dd className="text-xl font-semibold">{margin}%</dd>
        </div>
        <div className="col-span-2 rounded-xl border border-[var(--line)] p-3">
          <dt className="text-[var(--ink-muted)]">Stock</dt>
          <dd className="text-xl font-semibold">{product.stock}</dd>
        </div>
      </dl>
    </Sheet>
  );
}
