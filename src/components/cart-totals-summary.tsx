import type { CartTotals } from "@/lib/cart-math";
import { formatINR } from "@/lib/money";

type CartTotalsSummaryProps = {
  totals: CartTotals;
  /** When true, subtotal row uses list prices before product discounts. */
  showListSubtotal?: boolean;
};

export function CartTotalsSummary({
  totals,
  showListSubtotal = false,
}: CartTotalsSummaryProps) {
  const subtotalLabel = showListSubtotal ? "Subtotal (list)" : "Subtotal";
  const subtotalValue = showListSubtotal ? totals.listSubtotal : totals.subtotal;

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-[var(--ink-muted)]">{subtotalLabel}</dt>
        <dd className="tabular-nums">{formatINR(subtotalValue)}</dd>
      </div>
      {totals.productDiscountTotal > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--ink-muted)]">Product discounts</dt>
          <dd className="tabular-nums">−{formatINR(totals.productDiscountTotal)}</dd>
        </div>
      ) : null}
      {showListSubtotal && totals.productDiscountTotal > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--ink-muted)]">After product discounts</dt>
          <dd className="tabular-nums">{formatINR(totals.subtotal)}</dd>
        </div>
      ) : null}
      {totals.cartDiscountTotal > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--ink-muted)]">Extra discount</dt>
          <dd className="tabular-nums">−{formatINR(totals.cartDiscountTotal)}</dd>
        </div>
      ) : null}
      {!showListSubtotal &&
      totals.productDiscountTotal <= 0 &&
      totals.cartDiscountTotal > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--ink-muted)]">Discount</dt>
          <dd className="tabular-nums">−{formatINR(totals.cartDiscountTotal)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatINR(totals.payable)}</dd>
      </div>
    </dl>
  );
}
