"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct } from "@/app/actions/products";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatINR, floorPercent, marginPercent } from "@/lib/money";
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
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-3 py-3 font-medium sm:px-4">Name</th>
                <th className="px-3 py-3 font-medium sm:px-4">SKU</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Cost
                </th>
                <th className="px-3 py-3 font-medium sm:px-4">SP</th>
                <th className="px-3 py-3 font-medium sm:px-4">Disc %</th>
                <th className="px-3 py-3 font-medium sm:px-4">Profit %</th>
                <th className="px-3 py-3 font-medium sm:px-4">Stock</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Tags
                </th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
                const profitPct = marginPercent(
                  Number(product.sell_price),
                  Number(product.cost_price),
                  Number(product.expense_percent) || 0,
                  Number(product.discount_percent) || 0,
                );
                const disc = floorPercent(product.discount_percent);
                return (
                  <tr
                    key={product.id}
                    className="border-t border-[var(--line)]"
                  >
                    <td className="max-w-[9rem] px-3 py-3 sm:max-w-none sm:px-4">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-semibold leading-snug hover:underline"
                      >
                        <span className="line-clamp-2">{product.name}</span>
                      </Link>
                      {product.kind === "combo" ? (
                        <span className="mt-1 inline-block rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                          Combo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[var(--ink-muted)] sm:px-4 sm:text-sm">
                      {product.sku}
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums sm:table-cell">
                      {formatINR(Number(product.cost_price))}
                    </td>
                    <td className="px-3 py-3 font-semibold tabular-nums sm:px-4">
                      {formatINR(Number(product.sell_price))}
                    </td>
                    <td className="px-3 py-3 tabular-nums sm:px-4">{disc}%</td>
                    <td
                      className={`px-3 py-3 font-semibold tabular-nums sm:px-4 ${
                        profitPct < 0 ? "text-red-700" : ""
                      }`}
                    >
                      {profitPct}%
                    </td>
                    <td
                      className={`px-3 py-3 tabular-nums sm:px-4 ${
                        stock <= 0 ? "font-medium text-red-700" : ""
                      }`}
                    >
                      {stock <= 0
                        ? "0"
                        : product.kind === "combo"
                          ? `${stock}*`
                          : stock}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {product.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--ink-muted)]">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/products/${product.id}`}
                          className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-sm font-semibold"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setPendingDelete(product);
                          }}
                          className="rounded-xl px-3 py-1.5 text-sm font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--ink-muted)] sm:hidden">
            Tap a name to edit. * = combo buildable qty.
          </p>
          <p className="hidden border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--ink-muted)] sm:block">
            Profit % is after discount % and expenses. * Combo stock is
            buildable qty.
          </p>
        </div>
      )}

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
