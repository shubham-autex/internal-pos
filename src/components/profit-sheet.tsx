"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Sheet } from "@/components/sheet";
import { useCart } from "@/components/cart-provider";
import { computeCartTotals } from "@/lib/cart-math";
import { formatINR } from "@/lib/money";

type ProfitSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function ProfitSheet({ open, onClose }: ProfitSheetProps) {
  const { items, discountAmount, discountPercent, totals, setDiscounts } = useCart();
  const [amount, setAmount] = useState(String(discountAmount || ""));
  const [percent, setPercent] = useState(String(discountPercent || ""));
  const [justApplied, setJustApplied] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(String(discountAmount || ""));
    setPercent(String(discountPercent || ""));
    setJustApplied(false);
    setItemsOpen(false);
  }, [open, discountAmount, discountPercent]);

  const draftAmount = Number(amount) || 0;
  const draftPercent = Number(percent) || 0;

  const preview = useMemo(
    () => computeCartTotals(items, draftAmount, draftPercent),
    [items, draftAmount, draftPercent],
  );

  const hasPendingChanges =
    draftAmount !== discountAmount || draftPercent !== discountPercent;

  function applyDiscounts(event: FormEvent) {
    event.preventDefault();
    setDiscounts(draftAmount, draftPercent);
    setJustApplied(true);
    window.setTimeout(() => setJustApplied(false), 1800);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Profit & discount" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-[var(--ink-muted)]">
          Preview discounts live, then Apply to update checkout.
        </p>

        <form
          onSubmit={applyDiscounts}
          className="rounded-2xl border border-[var(--line)] p-3 sm:p-4"
        >
          <h3 className="font-semibold">Custom discount</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Fixed ₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Percent %</span>
              <input
                type="text"
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              />
            </label>
          </div>

          <div className="mt-3 rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
              Live preview
            </p>
            <dl className="space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Subtotal</dt>
                <dd>{formatINR(preview.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Discount</dt>
                <dd>−{formatINR(preview.discountTotal)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Payable</dt>
                <dd>{formatINR(preview.payable)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Expense</dt>
                <dd>−{formatINR(preview.expenseTotal)}</dd>
              </div>
              <div className="flex justify-between font-semibold text-[var(--accent-ink)]">
                <dt>Profit</dt>
                <dd>{formatINR(preview.profit)}</dd>
              </div>
            </dl>
          </div>

          <button
            type="submit"
            className="mt-3 w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
            disabled={!hasPendingChanges}
          >
            {hasPendingChanges ? "Apply discount" : "Applied"}
          </button>
          {justApplied ? (
            <p className="mt-2 text-center text-sm font-medium text-emerald-800">
              Discount applied.
            </p>
          ) : null}
        </form>

        <div className="rounded-2xl border border-[var(--line)]">
          <button
            type="button"
            onClick={() => setItemsOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-3 py-3.5 text-left sm:px-4"
            aria-expanded={itemsOpen}
          >
            <div>
              <p className="font-semibold">Items</p>
              <p className="text-xs text-[var(--ink-muted)]">
                {totals.lines.length} line{totals.lines.length === 1 ? "" : "s"} · tap
                to {itemsOpen ? "hide" : "show"}
              </p>
            </div>
            <span className="text-lg font-semibold text-[var(--ink-muted)]" aria-hidden>
              {itemsOpen ? "−" : "+"}
            </span>
          </button>

          {itemsOpen ? (
            <div className="space-y-2 border-t border-[var(--line)] px-3 py-3 sm:px-4">
              {totals.lines.map((line) => (
                <div
                  key={line.productId}
                  className="rounded-xl bg-[var(--surface-muted)] px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium leading-snug">
                        {line.name}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {line.qty}× · {line.sku}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[var(--accent-ink)]">
                      {formatINR(line.lineProfit)} profit
                    </p>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 text-xs text-[var(--ink-muted)]">
                    <span>Sell {formatINR(line.lineTotal)}</span>
                    <span>Cost {formatINR(line.lineCost)}</span>
                    <span>
                      Exp {formatINR(line.lineExpense)}
                      {line.expensePercent > 0 ? ` (${line.expensePercent}%)` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--line)] p-3 sm:p-4">
          <h3 className="font-semibold">Applied on checkout</h3>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Discount</dt>
              <dd>−{formatINR(totals.discountTotal)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Payable</dt>
              <dd>{formatINR(totals.payable)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--ink-muted)]">Expense</dt>
              <dd>−{formatINR(totals.expenseTotal)}</dd>
            </div>
            <div className="flex justify-between font-semibold text-[var(--accent-ink)]">
              <dt>Profit</dt>
              <dd>{formatINR(totals.profit)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Sheet>
  );
}
