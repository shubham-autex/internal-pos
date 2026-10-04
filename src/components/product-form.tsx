"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/app/actions/products";
import { QrScanner } from "@/components/qr-scanner";
import type { Product } from "@/lib/types";

const initial: ProductActionState = {};

type ProductFormProps = {
  product?: Product;
};

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const actionFn = isEdit ? updateProduct : createProduct;
  const [state, action, pending] = useActionState(actionFn, initial);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (!state.success || !state.productId) return;
    router.push("/products");
  }, [state.success, state.productId, router]);

  return (
    <>
      <form
        action={action}
        className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
      >
        {product ? <input type="hidden" name="id" value={product.id} /> : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Name</span>
          <input
            name="name"
            required
            defaultValue={product?.name}
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-sm font-medium">SKU / barcode</span>
          <div className="flex gap-2">
            <input
              name="sku"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              className="shrink-0 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--surface)]"
            >
              Scan
            </button>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Description</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={product?.description ?? ""}
            className="w-full resize-y rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Cost ₹</span>
            <input
              name="cost_price"
              required
              inputMode="decimal"
              defaultValue={product ? String(product.cost_price) : undefined}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Sell ₹</span>
            <input
              name="sell_price"
              required
              inputMode="decimal"
              defaultValue={product ? String(product.sell_price) : undefined}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Stock</span>
            <input
              name="stock"
              defaultValue={product ? String(product.stock) : "0"}
              inputMode="numeric"
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
        </div>

        {state.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Update product" : "Save product"}
        </button>
      </form>

      <QrScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(value) => setSku(value)}
        title="Scan SKU / barcode"
        variant="modal"
      />
    </>
  );
}
