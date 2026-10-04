"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct } from "@/app/actions/products";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatINR } from "@/lib/money";
import type { Product } from "@/lib/types";

export function ProductList({ products }: { products: Product[] }) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {products.map((product) => {
          const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
          return (
            <li
              key={product.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {product.name}
                    {product.kind === "combo" ? (
                      <span className="ml-2 rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                        Combo
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    {product.sku} · {formatINR(Number(product.sell_price))}
                  </p>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      stock <= 0 ? "text-red-700" : "text-[var(--ink)]"
                    }`}
                  >
                    {stock <= 0
                      ? "Out of stock"
                      : product.kind === "combo"
                        ? `${stock} buildable`
                        : `${stock} left`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <Link
                    href={`/products/${product.id}`}
                    className="rounded-xl border border-[var(--line)] px-3 py-2 text-center text-sm font-semibold"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setPendingDelete(product);
                    }}
                    className="rounded-xl px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--ink-muted)]">
          No products yet.{" "}
          <Link href="/products/bulk" className="font-semibold underline">
            Bulk add
          </Link>{" "}
          or{" "}
          <Link href="/products/new" className="font-semibold underline">
            add one
          </Link>
          .
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product?"
        message={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed from sell and product lists.`
            : ""
        }
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete || isPending) return;
          const id = pendingDelete.id;
          startTransition(async () => {
            const result = await deleteProduct(id);
            if (result.error) {
              setError(result.error);
              setPendingDelete(null);
              return;
            }
            setPendingDelete(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
