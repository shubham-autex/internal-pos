"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProductInfoDialog } from "@/components/product-info-dialog";
import { QtyDialog } from "@/components/qty-dialog";
import { QrScanner } from "@/components/qr-scanner";
import { useCart } from "@/components/cart-provider";
import { formatINR } from "@/lib/money";
import type { Product } from "@/lib/types";

export function ProductGrid({ products }: { products: Product[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addProduct, clearCart, itemCount, totals, items, setQty, removeItem } =
    useCart();
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<Product | null>(null);
  const [infoProduct, setInfoProduct] = useState<Product | null>(null);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const infoId = searchParams.get("info");
    if (!infoId) return;
    const match = products.find((p) => p.id === infoId);
    if (match) setInfoProduct(match);
  }, [searchParams, products]);

  function closeInfo() {
    setInfoProduct(null);
    if (searchParams.get("info")) {
      router.replace("/", { scroll: false });
    }
  }

  function openInfo(product: Product) {
    setInfoProduct(product);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function askQty(product: Product) {
    setPending(product);
  }

  function handleScan(value: string) {
    if (pending) return;
    const match = products.find(
      (p) => p.sku.toLowerCase() === value.toLowerCase() || p.id === value,
    );
    if (!match) {
      flash(`No product for “${value}”`);
      return;
    }
    askQty(match);
  }

  function confirmQty(qty: number) {
    if (!pending) return;
    const product = pending;
    setPending(null);
    addProduct(product, qty);
    flash(`Added ${qty}× ${product.name}`);
  }

  const cartLines = (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li
          key={item.productId}
          className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{item.name}</p>
            <p className="text-xs text-[var(--ink-muted)]">
              {formatINR(item.sellPrice)} each
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQty(item.productId, item.qty - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-lg font-semibold"
              aria-label={`Decrease ${item.name}`}
            >
              −
            </button>
            <span className="w-7 text-center font-semibold">{item.qty}</span>
            <button
              type="button"
              onClick={() => setQty(item.productId, item.qty + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] text-lg font-semibold"
              aria-label={`Increase ${item.name}`}
            >
              +
            </button>
          </div>
          <span className="w-16 shrink-0 text-right font-semibold">
            {formatINR(item.qty * item.sellPrice)}
          </span>
          <button
            type="button"
            onClick={() => removeItem(item.productId)}
            className="text-xs font-medium text-red-700"
            aria-label={`Remove ${item.name}`}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={`space-y-4 sm:pb-8 ${cartExpanded ? "pb-80" : "pb-28"}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
            Sell
          </h1>
          <p className="text-xs text-[var(--ink-muted)] sm:text-sm">
            Scan → enter qty → cart
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (itemCount === 0) return;
            setConfirmClear(true);
          }}
          className="shrink-0 text-sm font-medium text-red-700 hover:underline disabled:opacity-40"
          disabled={itemCount === 0}
        >
          Clear cart
        </button>
      </div>

      <QrScanner
        open
        variant="inline"
        paused={Boolean(pending) || Boolean(infoProduct) || confirmClear}
        onScan={handleScan}
        title="Scan to add"
      />

      <aside className="hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:block">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Cart
          </h2>
          <span className="text-sm text-[var(--ink-muted)]">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>
        {items.length > 0 ? (
          <div className="mb-3 max-h-52 overflow-y-auto">{cartLines}</div>
        ) : (
          <p className="mb-3 text-sm text-[var(--ink-muted)]">Cart is empty.</p>
        )}
        <p className="mb-1 text-2xl font-semibold">{formatINR(totals.payable)}</p>
        <p className="mb-4 text-xs text-[var(--ink-muted)]">
          Est. profit {formatINR(totals.profit)}
        </p>
        <Link
          href="/checkout"
          className={`block rounded-xl px-3 py-3 text-center text-sm font-semibold ${
            itemCount === 0
              ? "pointer-events-none bg-[var(--surface-muted)] text-[var(--ink-muted)]"
              : "bg-[var(--ink)] text-[var(--surface)]"
          }`}
        >
          Checkout
        </Link>
      </aside>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Search SKU</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or SKU"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        />
      </label>

      {toast ? (
        <p
          className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--accent-ink)]"
          role="status"
          aria-live="polite"
        >
          {toast}
        </p>
      ) : null}

      <section className="space-y-2">
        {filtered.map((product) => (
          <article
            key={product.id}
            className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="truncate font-semibold leading-snug">
                  {product.name}
                </h2>
                <p className="shrink-0 text-base font-semibold">
                  {formatINR(Number(product.sell_price))}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{product.sku}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openInfo(product);
                }}
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink)]"
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => askQty(product)}
                className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
              >
                Add
              </button>
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--ink-muted)]">
            No products match. Add items or check SKU.
          </p>
        ) : null}
      </section>

      {/* Mobile sticky cart — expand on same page */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_96%,transparent)] backdrop-blur-md sm:hidden">
        {cartExpanded ? (
          <div className="border-b border-[var(--line)] px-3 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Cart items</p>
              <button
                type="button"
                onClick={() => setCartExpanded(false)}
                className="text-sm font-medium text-[var(--ink-muted)]"
              >
                Collapse
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto pb-3">
              {items.length > 0 ? (
                cartLines
              ) : (
                <p className="py-4 text-center text-sm text-[var(--ink-muted)]">
                  Cart is empty.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div className="mx-auto flex max-w-6xl items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => setCartExpanded((v) => !v)}
            className="min-w-0 flex-1 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-left"
            aria-expanded={cartExpanded}
          >
            <p className="text-xs text-[var(--ink-muted)]">
              {itemCount} item{itemCount === 1 ? "" : "s"} · tap to{" "}
              {cartExpanded ? "hide" : "expand"}
            </p>
            <p className="truncate text-lg font-semibold">
              {formatINR(totals.payable)}
            </p>
          </button>
          <Link
            href="/checkout"
            className={`rounded-xl px-5 py-3 text-sm font-semibold ${
              itemCount === 0
                ? "pointer-events-none bg-[var(--surface-muted)] text-[var(--ink-muted)]"
                : "bg-[var(--ink)] text-[var(--surface)]"
            }`}
          >
            Checkout
          </Link>
        </div>
      </div>

      {pending ? (
        <QtyDialog
          product={pending}
          onConfirm={confirmQty}
          onCancel={() => setPending(null)}
        />
      ) : null}

      {infoProduct ? (
        <ProductInfoDialog product={infoProduct} onClose={closeInfo} />
      ) : null}

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
          setCartExpanded(false);
        }}
      />
    </div>
  );
}
