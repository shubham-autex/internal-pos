"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCart } from "@/components/cart-provider";
import { computeCartTotals } from "@/lib/cart-math";
import { formatINR } from "@/lib/money";

export function ProfitClient() {
  const { items, discountAmount, discountPercent, totals, setDiscounts, clearCart } =
    useCart();
  const [amount, setAmount] = useState(String(discountAmount || ""));
  const [percent, setPercent] = useState(String(discountPercent || ""));
  const [confirmClear, setConfirmClear] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  const draftAmount = Number(amount) || 0;
  const draftPercent = Number(percent) || 0;

  const preview = useMemo(
    () => computeCartTotals(items, draftAmount, draftPercent),
    [items, draftAmount, draftPercent],
  );

  const hasPendingChanges =
    draftAmount !== discountAmount || draftPercent !== discountPercent;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          No cart to analyse
        </h1>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold underline">
          Back to items
        </Link>
      </div>
    );
  }

  function applyDiscounts(event: FormEvent) {
    event.preventDefault();
    setDiscounts(draftAmount, draftPercent);
    setJustApplied(true);
    window.setTimeout(() => setJustApplied(false), 1800);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Profit
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Line margins and custom discounts before payment.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-medium"
          >
            Clear cart
          </button>
          <Link
            href="/checkout"
            className="rounded-xl bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-[var(--surface)]"
          >
            Back to checkout
          </Link>
        </div>
      </div>

      <section className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--ink-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Sell</th>
              <th className="px-4 py-3 font-medium">Cost</th>
              <th className="px-4 py-3 font-medium">Profit</th>
            </tr>
          </thead>
          <tbody>
            {totals.lines.map((line) => (
              <tr key={line.productId} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <p className="font-medium">{line.name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">{line.sku}</p>
                </td>
                <td className="px-4 py-3">{line.qty}</td>
                <td className="px-4 py-3">{formatINR(line.lineTotal)}</td>
                <td className="px-4 py-3">{formatINR(line.lineCost)}</td>
                <td className="px-4 py-3 font-semibold">{formatINR(line.lineProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={applyDiscounts}
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Custom discount
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Edit below to preview. Totals only change after Apply.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Fixed ₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Percent %</span>
              <input
                type="text"
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Live preview
            </p>
            <dl className="space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Subtotal</dt>
                <dd>{formatINR(preview.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">
                  Discount
                  {draftPercent > 0
                    ? ` (${formatINR(Math.max(0, draftAmount))} + ${draftPercent}%)`
                    : ""}
                </dt>
                <dd>−{formatINR(preview.discountTotal)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Payable</dt>
                <dd>{formatINR(preview.payable)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-[var(--accent-ink)]">
                <dt>Profit</dt>
                <dd>{formatINR(preview.profit)}</dd>
              </div>
            </dl>
          </div>

          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
            disabled={!hasPendingChanges}
          >
            {hasPendingChanges ? "Apply discount" : "Applied"}
          </button>
          {justApplied ? (
            <p className="mt-2 text-center text-sm font-medium text-emerald-800">
              Discount applied to cart.
            </p>
          ) : null}
        </form>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Applied summary
            </h2>
            {hasPendingChanges ? (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                Preview differs
              </span>
            ) : null}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Subtotal</dt>
              <dd>{formatINR(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Discount</dt>
              <dd>−{formatINR(totals.discountTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Cost</dt>
              <dd>{formatINR(totals.costTotal)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Payable</dt>
              <dd>{formatINR(totals.payable)}</dd>
            </div>
            <div className="flex justify-between text-lg font-semibold text-[var(--accent-ink)]">
              <dt>Profit</dt>
              <dd>{formatINR(totals.profit)}</dd>
            </div>
          </dl>
          {hasPendingChanges ? (
            <p className="mt-4 text-xs text-[var(--ink-muted)]">
              Checkout still uses the applied values until you press Apply.
            </p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear cart?"
        message="Clear cart for this customer? All items will be removed."
        confirmLabel="Clear cart"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearCart();
          setConfirmClear(false);
        }}
      />
    </div>
  );
}
