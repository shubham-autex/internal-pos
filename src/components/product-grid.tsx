"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProductInfoDialog } from "@/components/product-info-dialog";
import { QtyDialog } from "@/components/qty-dialog";
import { QrScanner } from "@/components/qr-scanner";
import { Sheet } from "@/components/sheet";
import { useCart } from "@/components/cart-provider";
import { CartTotalsSummary } from "@/components/cart-totals-summary";
import { formatINR, floorPercent, netSellPrice, roundMoney } from "@/lib/money";
import type { Product } from "@/lib/types";

function SalePrice({
  listPrice,
  discountPercent,
}: {
  listPrice: number;
  discountPercent: number;
}) {
  const disc = floorPercent(discountPercent);
  const net = netSellPrice(listPrice, disc);
  if (disc <= 0) {
    return (
      <span className="shrink-0 self-start text-base font-semibold tabular-nums sm:self-auto">
        {formatINR(listPrice)}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 self-start text-left sm:self-auto sm:text-right">
      <span className="text-base font-bold tabular-nums text-[var(--accent-ink)] sm:text-lg">
        {formatINR(net)}
      </span>
      <span className="text-[11px] tabular-nums text-[var(--ink-muted)] line-through">
        {formatINR(listPrice)}
      </span>
      <span className="rounded bg-[var(--accent-soft)] px-1 py-px text-[11px] font-semibold text-[var(--accent-ink)]">
        {disc}%
      </span>
    </span>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    addProduct,
    clearCart,
    itemCount,
    totals,
    items,
    setQty,
    removeItem,
    availableStock,
  } = useCart();
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
    const result = addProduct(product, qty);
    if (!result.ok) {
      flash(`${product.name} is out of stock`);
      return;
    }
    flash(
      result.limited
        ? `Only ${result.added} left — added ${result.added}× ${product.name}`
        : `Added ${result.added}× ${product.name}`,
    );
  }

  const cartHasProductDiscount = totals.productDiscountTotal > 0;

  const cartLines = (
    <ul className="space-y-2 text-sm">
      {items.map((item) => {
        const left = Math.max(0, item.stock - item.qty);
        const discPct = floorPercent(item.discountPercent);
        const unitNet = netSellPrice(item.sellPrice, discPct);
        const lineTotal = roundMoney(unitNet * item.qty);
        const lineListTotal = roundMoney(item.sellPrice * item.qty);
        const onSale = discPct > 0;
        return (
          <li
            key={item.productId}
            className="rounded-xl bg-[var(--surface-muted)] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium leading-snug">{item.name}</p>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {onSale ? (
                    <>
                      <span className="line-through opacity-70">
                        {formatINR(item.sellPrice)}
                      </span>{" "}
                      <span className="font-semibold text-[var(--accent-ink)]">
                        {formatINR(unitNet)}
                      </span>{" "}
                      each
                      {" · "}
                      <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-ink)]">
                        {discPct}% off
                      </span>
                      {" · "}
                    </>
                  ) : (
                    <>{formatINR(item.sellPrice)} each · </>
                  )}
                  <span
                    className={
                      left <= 0 ? "font-medium text-red-700" : "font-medium"
                    }
                  >
                    {left <= 0 ? "none left" : `${left} left`}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="-mr-1 shrink-0 rounded-lg px-2 py-2 text-sm font-semibold text-red-700"
                aria-label={`Remove ${item.name}`}
              >
                Remove
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQty(item.productId, item.qty - 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface)] text-xl font-semibold"
                  aria-label={`Decrease ${item.name}`}
                >
                  −
                </button>
                <span className="min-w-8 text-center text-base font-semibold">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(item.productId, item.qty + 1)}
                  disabled={item.qty >= item.stock}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface)] text-xl font-semibold disabled:opacity-40"
                  aria-label={`Increase ${item.name}`}
                >
                  +
                </button>
              </div>
              <div className="text-right">
                {onSale ? (
                  <>
                    <span className="block text-xs tabular-nums text-[var(--ink-muted)] line-through">
                      {formatINR(lineListTotal)}
                    </span>
                    <span className="block text-base font-semibold tabular-nums text-[var(--accent-ink)]">
                      {formatINR(lineTotal)}
                    </span>
                  </>
                ) : (
                  <span className="text-base font-semibold tabular-nums">
                    {formatINR(lineTotal)}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-3 pb-24 sm:space-y-4 sm:pb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-3xl">
            Sell
          </h1>
          <p className="text-xs text-[var(--ink-muted)] sm:text-sm">
            Scan → qty → cart
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
        paused={
          Boolean(pending) || Boolean(infoProduct) || confirmClear || cartExpanded
        }
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
        {cartHasProductDiscount ? (
          <p className="mb-0.5 text-sm tabular-nums text-[var(--ink-muted)] line-through">
            {formatINR(totals.listSubtotal)}
          </p>
        ) : null}
        <p
          className={`text-2xl tabular-nums ${
            cartHasProductDiscount
              ? "mb-1 font-bold text-[var(--accent-ink)]"
              : "mb-4 font-semibold"
          }`}
        >
          {formatINR(totals.payable)}
        </p>
        {cartHasProductDiscount ? (
          <p className="mb-4 text-xs font-semibold text-[var(--accent-ink)]">
            {formatINR(totals.productDiscountTotal)} off from product discounts
          </p>
        ) : null}
        <Link
          href="/checkout"
          prefetch
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
        <span className="mb-1 block text-sm font-medium">Search SKU</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or SKU"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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

      <section className="space-y-1.5">
        {filtered.map((product) => {
          const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
          const room = availableStock(product);
          const out = stock <= 0 || room <= 0;
          const stockLabel =
            stock <= 0
              ? "Out of stock"
              : room <= 0
                ? "All in cart"
                : product.kind === "combo"
                  ? `${stock} buildable`
                  : `${stock} left`;
          return (
            <article
              key={product.id}
              className="product-row flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                  <h2 className="min-w-0 text-sm font-semibold leading-snug wrap-break-word sm:truncate sm:text-base">
                    {product.name}
                    {product.kind === "combo" ? (
                      <span className="ml-1.5 inline-block align-middle rounded bg-[var(--accent-soft)] px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                        Combo
                      </span>
                    ) : null}
                  </h2>
                  <SalePrice
                    listPrice={Number(product.sell_price)}
                    discountPercent={Number(product.discount_percent) || 0}
                  />
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="max-w-full truncate rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-[var(--ink)]">
                    {product.sku}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                      out
                        ? "bg-red-50 text-red-700"
                        : "bg-[var(--surface-muted)] text-[var(--ink)]"
                    }`}
                  >
                    {stockLabel}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openInfo(product);
                  }}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--line)] px-2.5 text-xs font-semibold text-[var(--ink)] sm:h-11 sm:rounded-xl sm:px-3 sm:text-sm"
                >
                  Info
                </button>
                <button
                  type="button"
                  onClick={() => askQty(product)}
                  disabled={out}
                  className="inline-flex h-10 min-w-14 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-ink)] disabled:opacity-40 sm:h-11 sm:min-w-16 sm:rounded-xl sm:text-sm"
                >
                  Add
                </button>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--ink-muted)]">
            No products match. Add items or check SKU.
          </p>
        ) : null}
      </section>

      <div className="sell-checkout-dock-wrap fixed inset-x-0 z-40 sm:hidden">
        <div className="sell-checkout-dock border-t border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-3 pt-2.5 pb-3">
            {itemCount === 0 ? (
              <p className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-muted)]">
                Cart empty — scan or add items to checkout
              </p>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setCartExpanded(true)}
                  className="min-w-0 rounded-2xl bg-[var(--surface-muted)] px-3.5 py-2.5 text-left"
                  aria-expanded={cartExpanded}
                  aria-haspopup="dialog"
                >
                  <p className="text-xs font-medium text-[var(--ink-muted)]">
                    Review cart · {itemCount} item{itemCount === 1 ? "" : "s"}
                  </p>
                  <p className="truncate text-xl font-semibold tabular-nums leading-tight">
                    {formatINR(totals.payable)}
                  </p>
                </button>
                <Link
                  href="/checkout"
                  prefetch
                  className="inline-flex min-h-14 min-w-[7.5rem] items-center justify-center rounded-2xl bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--surface)]"
                >
                  Checkout
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet
        open={cartExpanded}
        onClose={() => setCartExpanded(false)}
        title="Cart"
        size="lg"
        footer={
          itemCount === 0 ? null : (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-12 rounded-xl px-3 text-sm font-semibold text-red-700"
              >
                Clear
              </button>
              <Link
                href="/checkout"
                prefetch
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--surface)]"
              >
                Checkout {formatINR(totals.payable)}
              </Link>
            </div>
          )
        }
      >
        {items.length > 0 ? (
          <>
            {cartLines}
            <div className="mt-4">
              <CartTotalsSummary totals={totals} showListSubtotal />
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
            Cart is empty.
          </p>
        )}
      </Sheet>

      {pending ? (
        <QtyDialog
          product={pending}
          maxQty={availableStock(pending)}
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
