"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { createOrder } from "@/app/actions/orders";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProfitSheet } from "@/components/profit-sheet";
import { useCart } from "@/components/cart-provider";
import { formatINR, roundMoney } from "@/lib/money";

type CheckoutClientProps = {
  upiId: string;
  upiName: string;
};

export function CheckoutClient({ upiId, upiName }: CheckoutClientProps) {
  const { items, discountAmount, discountPercent, totals, clearCart, setQty } =
    useCart();
  const [mode, setMode] = useState<"upi" | "cash">("upi");
  const [cashTendered, setCashTendered] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneOrderId, setDoneOrderId] = useState<string | null>(null);
  const [profitOpen, setProfitOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const tendered = Number(cashTendered) || 0;
  const change = roundMoney(Math.max(0, tendered - totals.payable));

  const upiUrl = useMemo(() => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: upiName,
      am: totals.payable.toFixed(2),
      cu: "INR",
      tn: "Mela Stall order",
    });
    return `upi://pay?${params.toString()}`;
  }, [upiId, upiName, totals.payable]);

  useEffect(() => {
    if (totals.payable <= 0) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(upiUrl, { width: 280, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [upiUrl, totals.payable]);

  async function complete(method: "upi" | "cash") {
    setBusy(true);
    setError(null);
    const result = await createOrder({
      items,
      discountAmount,
      discountPercent,
      paymentMethod: method,
      cashTendered: method === "cash" ? tendered : null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    clearCart();
    setDoneOrderId(result.orderId);
  }

  if (doneOrderId) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Paid
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Order saved. Ready for the next customer.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)]"
          >
            New sale
          </Link>
          <Link
            href="/orders"
            className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold"
          >
            View orders
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Cart is empty
        </h1>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold underline">
          Back to items
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Checkout
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Review cart, then collect payment.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-medium text-red-700"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setProfitOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] text-sm font-bold"
              aria-label="Profit analysis and discounts"
              title="Profit & discounts"
            >
              i
            </button>
          </div>
        </div>

        <ul className="divide-y divide-[var(--line)]">
          {items.map((item) => {
            const left = Math.max(0, item.stock - item.qty);
            return (
              <li key={item.productId} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {formatINR(item.sellPrice)} × {item.qty}
                    {" · "}
                    <span
                      className={
                        left <= 0 ? "font-medium text-red-700" : "font-medium"
                      }
                    >
                      {left <= 0 ? "none left" : `${left} left`}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-[var(--line)]"
                    onClick={() => setQty(item.productId, item.qty - 1)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-[var(--line)] disabled:opacity-40"
                    disabled={item.qty >= item.stock}
                    onClick={() => setQty(item.productId, item.qty + 1)}
                  >
                    +
                  </button>
                </div>
                <p className="w-20 text-right font-semibold">
                  {formatINR(item.sellPrice * item.qty)}
                </p>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--ink-muted)]">Subtotal</dt>
            <dd>{formatINR(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--ink-muted)]">Discount</dt>
            <dd>−{formatINR(totals.discountTotal)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatINR(totals.payable)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Payment
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("upi")}
            className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
              mode === "upi"
                ? "bg-[var(--ink)] text-[var(--surface)]"
                : "bg-[var(--surface-muted)]"
            }`}
          >
            UPI QR
          </button>
          <button
            type="button"
            onClick={() => setMode("cash")}
            className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
              mode === "cash"
                ? "bg-[var(--ink)] text-[var(--surface)]"
                : "bg-[var(--surface-muted)]"
            }`}
          >
            Cash
          </button>
        </div>

        {mode === "upi" ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-[var(--ink-muted)]">
              Show this QR. Amount includes discounts. Set your UPI id in env.
            </p>
            <div className="flex justify-center rounded-2xl bg-white p-4">
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  alt="UPI payment QR"
                  width={280}
                  height={280}
                  unoptimized
                />
              ) : (
                <div className="flex h-[280px] w-[280px] items-center justify-center text-sm text-[var(--ink-muted)]">
                  Generating QR…
                </div>
              )}
            </div>
            <p className="text-center text-sm">
              {upiName} · {upiId}
              <br />
              <span className="font-semibold">{formatINR(totals.payable)}</span>
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => complete("upi")}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
            >
              {busy ? "Saving…" : "Mark as paid"}
            </button>
          </div>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void complete("cash");
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Cash received
              </span>
              <input
                type="text"
                inputMode="decimal"
                name="cash_tendered"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                required
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                placeholder="e.g. 500"
              />
            </label>
            <div className="rounded-xl bg-[var(--accent-soft)] px-3 py-3 text-sm">
              <p>
                Total due: <strong>{formatINR(totals.payable)}</strong>
              </p>
              <p className="mt-1 text-lg font-semibold">
                Return: {formatINR(tendered >= totals.payable ? change : 0)}
              </p>
              {tendered > 0 && tendered < totals.payable ? (
                <p className="mt-1 text-red-700">Need more cash from customer.</p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={busy || tendered < totals.payable}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
            >
              {busy ? "Saving…" : "Accept cash"}
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <ProfitSheet open={profitOpen} onClose={() => setProfitOpen(false)} />

      <ConfirmDialog
        open={confirmClear}
        title="Clear cart?"
        message="This removes every item from the current cart."
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
