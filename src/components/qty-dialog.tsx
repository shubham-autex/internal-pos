"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { formatINR } from "@/lib/money";
import type { Product } from "@/lib/types";

type QtyDialogProps = {
  product: Product;
  /** How many can still be added (stock minus cart qty). */
  maxQty: number;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
};

export function QtyDialog({
  product,
  maxQty,
  onConfirm,
  onCancel,
}: QtyDialogProps) {
  const limit = Math.max(0, Math.floor(maxQty));
  const [qty, setQty] = useState(limit > 0 ? 1 : 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const unit = Number(product.sell_price);
  const lineTotal = unit * qty;
  const outOfStock = limit <= 0;

  useEffect(() => {
    if (outOfStock) return;
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, [outOfStock]);

  function bump(delta: number) {
    setQty((q) => Math.max(1, Math.min(limit, q + delta)));
  }

  function submit() {
    if (outOfStock || qty < 1 || qty > limit) return;
    onConfirm(qty);
  }

  const presets = [1, 2, 3, 5, 10].filter((n) => n <= limit);

  return (
    <Sheet open onClose={onCancel} title="How many?" size="sm">
      <p className="text-base font-semibold leading-snug">{product.name}</p>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">
        {product.sku} · {formatINR(unit)} each
      </p>
      <p
        className={`mt-2 text-sm font-medium ${
          outOfStock ? "text-red-700" : "text-[var(--ink)]"
        }`}
      >
        {outOfStock ? "Out of stock" : `${limit} left`}
      </p>

      {outOfStock ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl bg-[var(--surface-muted)] px-3 py-3.5 text-sm font-semibold"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => bump(-1)}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-2xl font-semibold"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              enterKeyHint="done"
              min={1}
              max={limit}
              value={qty}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) {
                  setQty(1);
                  return;
                }
                setQty(Math.max(1, Math.min(limit, Math.floor(n))));
              }}
              className="h-14 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] text-center text-3xl font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => bump(1)}
              disabled={qty >= limit}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-2xl font-semibold disabled:opacity-40"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {presets.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQty(n)}
                  className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold ${
                    qty === n
                      ? "bg-[var(--ink)] text-[var(--surface)]"
                      : "bg-[var(--surface-muted)] text-[var(--ink)]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : null}

          <p className="mt-4 text-center text-sm text-[var(--ink-muted)]">
            Amount{" "}
            <span className="text-lg font-semibold text-[var(--ink)]">
              {formatINR(lineTotal)}
            </span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-3 py-3.5 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="rounded-xl bg-[var(--accent)] px-3 py-3.5 text-sm font-semibold text-[var(--accent-ink)]"
            >
              Add {qty}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
