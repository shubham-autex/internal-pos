import type { CartTotals } from "@/lib/cart-math";
import { formatINR, roundMoney } from "@/lib/money";

type CartTotalsSummaryProps = {
  totals: CartTotals;
  /** When true, subtotal row uses list prices before product discounts. */
  showListSubtotal?: boolean;
  /** Show surge breakdown (info popup only). */
  showSurge?: boolean;
  /**
   * Checkout: treat surge as part of the listed price so the customer
   * never sees a separate extra charge.
   */
  bakeSurge?: boolean;
};

export function CartTotalsSummary({
  totals,
  showListSubtotal = false,
  showSurge = false,
  bakeSurge = false,
}: CartTotalsSummaryProps) {
  const subtotalLabel =
    showListSubtotal && !bakeSurge ? "Subtotal (list)" : "Subtotal";
  const subtotalValue = showListSubtotal
    ? roundMoney(totals.listSubtotal + (bakeSurge ? totals.surgeTotal : 0))
    : totals.subtotal;
  const showAfterAdjustments =
    showListSubtotal &&
    (totals.productDiscountTotal > 0 ||
      (!bakeSurge &&
        (totals.surgeTotal > 0 || totals.subtotal !== totals.listSubtotal)));
  const afterLabel =
    showSurge && totals.surgeTotal > 0
      ? "After discounts & surge"
      : totals.productDiscountTotal > 0
        ? "After product discounts"
        : "Line subtotal";

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
      {showSurge && showListSubtotal && totals.surgeTotal > 0 ? (
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--ink-muted)]">Surge</dt>
          <dd className="tabular-nums">+{formatINR(totals.surgeTotal)}</dd>
        </div>
      ) : null}
      {showAfterAdjustments ? (
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--ink-muted)]">{afterLabel}</dt>
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
