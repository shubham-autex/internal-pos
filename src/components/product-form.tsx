"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProduct,
  updateProduct,
  type ProductActionState,
} from "@/app/actions/products";
import { QrScanner } from "@/components/qr-scanner";
import { deriveComboCosting, comboAvailableStock } from "@/lib/combo";
import { formatINR } from "@/lib/money";
import { formatTagsInput } from "@/lib/tags";
import type { Product, ProductKind } from "@/lib/types";

const initial: ProductActionState = {};

type ComponentDraft = {
  component_id: string;
  quantity: string;
};

type ProductFormProps = {
  product?: Product;
  /** Simple products available to include in a combo. */
  simpleProducts?: Product[];
  /** Force starting kind (e.g. new combo page). */
  defaultKind?: ProductKind;
};

export function ProductForm({
  product,
  simpleProducts = [],
  defaultKind,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const lockedKind = (product?.kind || defaultKind || "simple") as ProductKind;
  const actionFn = isEdit ? updateProduct : createProduct;
  const [state, action, pending] = useActionState(actionFn, initial);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [scanOpen, setScanOpen] = useState(false);
  const [kind, setKind] = useState<ProductKind>(lockedKind);
  const [sellPrice, setSellPrice] = useState(
    product ? String(product.sell_price) : "",
  );
  const [components, setComponents] = useState<ComponentDraft[]>(() =>
    (product?.components ?? []).map((component) => ({
      component_id: component.component_id,
      quantity: String(component.quantity),
    })),
  );
  const [pickerId, setPickerId] = useState("");

  const isCombo = kind === "combo";
  const simpleById = useMemo(
    () => new Map(simpleProducts.map((item) => [item.id, item])),
    [simpleProducts],
  );

  const derived = useMemo(() => {
    if (!isCombo) return null;
    const sell = Number(sellPrice) || 0;
    const inputs = components
      .map((row) => {
        const item = simpleById.get(row.component_id);
        if (!item) return null;
        return {
          cost_price: Number(item.cost_price) || 0,
          sell_price: Number(item.sell_price) || 0,
          expense_percent: Number(item.expense_percent) || 0,
          quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
          stock: Number(item.stock) || 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const costing = deriveComboCosting(sell, inputs);
    const stock = comboAvailableStock(inputs);
    return { ...costing, stock };
  }, [isCombo, sellPrice, components, simpleById]);

  useEffect(() => {
    if (!state.success || !state.productId) return;
    router.push("/products");
  }, [state.success, state.productId, router]);

  function addComponent() {
    if (!pickerId) return;
    if (components.some((row) => row.component_id === pickerId)) {
      setPickerId("");
      return;
    }
    setComponents((prev) => [
      ...prev,
      { component_id: pickerId, quantity: "1" },
    ]);
    setPickerId("");
  }

  const availableToPick = simpleProducts.filter(
    (item) =>
      item.id !== product?.id &&
      !components.some((row) => row.component_id === item.id),
  );

  return (
    <>
      <form
        action={action}
        className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
      >
        {product ? <input type="hidden" name="id" value={product.id} /> : null}
        <input type="hidden" name="kind" value={kind} />
        {isCombo ? (
          <>
            <input
              type="hidden"
              name="cost_price"
              value={derived ? String(derived.cost_price) : "0"}
            />
            <input
              type="hidden"
              name="expense_percent"
              value={derived ? String(derived.expense_percent) : "0"}
            />
            <input type="hidden" name="stock" value="0" />
            <input
              type="hidden"
              name="components_json"
              value={JSON.stringify(
                components.map((row) => ({
                  component_id: row.component_id,
                  quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
                })),
              )}
            />
          </>
        ) : null}

        {!isEdit ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("simple")}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
                kind === "simple"
                  ? "bg-[var(--ink)] text-[var(--surface)]"
                  : "bg-[var(--surface-muted)]"
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setKind("combo")}
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
                kind === "combo"
                  ? "bg-[var(--ink)] text-[var(--surface)]"
                  : "bg-[var(--surface-muted)]"
              }`}
            >
              Combo
            </button>
          </div>
        ) : (
          <p className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm">
            Type: <strong>{isCombo ? "Combo" : "Simple"}</strong>
          </p>
        )}

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

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Tags</span>
          <input
            name="tags"
            defaultValue={formatTagsInput(product?.tags)}
            placeholder="e.g. snack, hot, combo-deal"
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
          <span className="mt-1 block text-xs text-[var(--ink-muted)]">
            Comma-separated. Same tag groups products together on the dashboard.
          </span>
        </label>

        {isCombo ? (
          <div className="space-y-3 rounded-2xl border border-[var(--line)] p-3">
            <div>
              <p className="font-semibold">Combo items</p>
              <p className="text-xs text-[var(--ink-muted)]">
                Cost and expense come from these products. Sell price is yours.
              </p>
            </div>

            <div className="flex gap-2">
              <select
                value={pickerId}
                onChange={(e) => setPickerId(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <option value="">Select product…</option>
                {availableToPick.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addComponent}
                disabled={!pickerId}
                className="shrink-0 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {components.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)]">
                No items yet. Add at least one product.
              </p>
            ) : (
              <ul className="space-y-2">
                {components.map((row) => {
                  const item = simpleById.get(row.component_id);
                  return (
                    <li
                      key={row.component_id}
                      className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item?.name ?? "Unknown product"}
                        </p>
                        <p className="text-xs text-[var(--ink-muted)]">
                          {item
                            ? `${item.sku} · cost ${formatINR(Number(item.cost_price))} · exp ${Number(item.expense_percent) || 0}%`
                            : row.component_id}
                        </p>
                      </div>
                      <label className="flex items-center gap-1 text-sm">
                        <span className="text-[var(--ink-muted)]">Qty</span>
                        <input
                          value={row.quantity}
                          inputMode="numeric"
                          onChange={(e) =>
                            setComponents((prev) =>
                              prev.map((component) =>
                                component.component_id === row.component_id
                                  ? { ...component, quantity: e.target.value }
                                  : component,
                              ),
                            )
                          }
                          className="w-16 rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setComponents((prev) =>
                            prev.filter(
                              (component) =>
                                component.component_id !== row.component_id,
                            ),
                          )
                        }
                        className="px-2 text-sm font-medium text-red-700"
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--line)] p-2">
                <dt className="text-xs text-[var(--ink-muted)]">Derived cost</dt>
                <dd className="font-semibold">
                  {formatINR(derived?.cost_price ?? 0)}
                </dd>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-2">
                <dt className="text-xs text-[var(--ink-muted)]">Derived exp</dt>
                <dd className="font-semibold">
                  {derived?.expense_percent ?? 0}%
                </dd>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-2">
                <dt className="text-xs text-[var(--ink-muted)]">Buildable</dt>
                <dd className="font-semibold">{derived?.stock ?? 0}</dd>
              </div>
              <div className="rounded-xl border border-[var(--line)] p-2">
                <dt className="text-xs text-[var(--ink-muted)]">Exp ₹</dt>
                <dd className="font-semibold">
                  {formatINR(derived?.expense_rupees ?? 0)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {!isCombo ? (
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
          ) : null}
          <label className={`block ${isCombo ? "sm:col-span-2" : ""}`}>
            <span className="mb-1.5 block text-sm font-medium">Sell ₹</span>
            <input
              name="sell_price"
              required
              inputMode="decimal"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
          {!isCombo ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Expense %</span>
                <input
                  name="expense_percent"
                  inputMode="decimal"
                  defaultValue={
                    product ? String(product.expense_percent ?? 0) : "0"
                  }
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
                <span className="mt-1 block text-xs text-[var(--ink-muted)]">
                  Percent of sell price used in costing.
                </span>
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
            </>
          ) : null}
        </div>

        {state.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || (isCombo && components.length === 0)}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
        >
          {pending
            ? "Saving…"
            : isEdit
              ? isCombo
                ? "Update combo"
                : "Update product"
              : isCombo
                ? "Save combo"
                : "Save product"}
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
