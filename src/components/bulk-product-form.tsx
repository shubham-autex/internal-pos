"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { bulkCreateProducts } from "@/app/actions/products";

type DraftRow = {
  key: string;
  name: string;
  sku: string;
  cost_price: string;
  sell_price: string;
  expense_percent: string;
  stock: string;
};

function emptyRow(): DraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    sku: "",
    cost_price: "",
    sell_price: "",
    expense_percent: "0",
    stock: "0",
  };
}

function looksLikeHeader(cells: string[]) {
  const joined = cells.join(" ").toLowerCase();
  return (
    joined.includes("name") &&
    (joined.includes("sku") || joined.includes("barcode"))
  );
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim());
  }
  // Simple CSV: split on commas outside quotes
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function parsePaste(text: string): DraftRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  let start = 0;
  const firstCells = splitLine(lines[0]);
  if (looksLikeHeader(firstCells)) start = 1;

  return lines.slice(start).map((line) => {
    const [name = "", sku = "", cost = "", sell = "", expense = "0", stock = "0"] =
      splitLine(line);
    return {
      ...emptyRow(),
      name,
      sku,
      cost_price: cost,
      sell_price: sell,
      expense_percent: expense || "0",
      stock: stock || "0",
    };
  });
}

function rowHasContent(row: DraftRow) {
  return Boolean(
    row.name.trim() ||
      row.sku.trim() ||
      row.cost_price.trim() ||
      row.sell_price.trim(),
  );
}

export function BulkProductForm() {
  const router = useRouter();
  const [rows, setRows] = useState<DraftRow[]>(() =>
    Array.from({ length: 5 }, () => emptyRow()),
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<number | null>(null);

  const filledCount = useMemo(
    () => rows.filter(rowHasContent).length,
    [rows],
  );

  function updateRow(key: string, field: keyof DraftRow, value: string) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function addRows(count = 1) {
    setRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => emptyRow()),
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => {
      if (prev.length <= 1) return [emptyRow()];
      return prev.filter((row) => row.key !== key);
    });
  }

  function applyPaste() {
    const parsed = parsePaste(pasteText);
    if (parsed.length === 0) {
      setError("Paste at least one product line");
      return;
    }
    setError(null);
    setRowErrors([]);
    setCreated(null);
    setRows(parsed);
    setPasteOpen(false);
    setPasteText("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setRowErrors([]);
    setCreated(null);

    const payload = rows.filter(rowHasContent).map((row) => ({
      name: row.name,
      sku: row.sku,
      cost_price: row.cost_price,
      sell_price: row.sell_price,
      expense_percent: row.expense_percent || 0,
      stock: row.stock || 0,
    }));

    const result = await bulkCreateProducts(payload);
    setBusy(false);

    if (!result.success) {
      setError(result.error ?? "Could not save products");
      setRowErrors(result.rowErrors ?? []);
      return;
    }

    setCreated(result.created ?? payload.length);
    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--ink-muted)]">
          {filledCount} product{filledCount === 1 ? "" : "s"} ready
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPasteOpen((v) => !v)}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold"
          >
            {pasteOpen ? "Hide paste" : "Paste list"}
          </button>
          <button
            type="button"
            onClick={() => addRows(1)}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold"
          >
            + Row
          </button>
        </div>
      </div>

      {pasteOpen ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-sm font-medium">Paste from Excel / CSV</p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            One product per line: Name, SKU, Cost, Sell, Expense %, Stock
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder={"Masala Chai, CHAI-01, 8, 20, 0, 200"}
            className="mt-3 w-full resize-y rounded-xl border border-[var(--line)] px-3 py-2.5 font-mono text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
          <button
            type="button"
            onClick={applyPaste}
            className="mt-3 w-full rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--surface)]"
          >
            Load pasted rows
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                Product {index + 1}
              </p>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="text-sm font-medium text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">Name</span>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(row.key, "name", e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-sm font-medium">SKU</span>
                <input
                  value={row.sku}
                  onChange={(e) => updateRow(row.key, "sku", e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Cost ₹</span>
                <input
                  value={row.cost_price}
                  inputMode="decimal"
                  onChange={(e) =>
                    updateRow(row.key, "cost_price", e.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Sell ₹</span>
                <input
                  value={row.sell_price}
                  inputMode="decimal"
                  onChange={(e) =>
                    updateRow(row.key, "sell_price", e.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Expense %</span>
                <input
                  value={row.expense_percent}
                  inputMode="decimal"
                  onChange={(e) =>
                    updateRow(row.key, "expense_percent", e.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Stock</span>
                <input
                  value={row.stock}
                  inputMode="numeric"
                  onChange={(e) => updateRow(row.key, "stock", e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => addRows(3)}
        className="w-full rounded-xl border border-dashed border-[var(--line)] px-4 py-3 text-sm font-semibold"
      >
        + Add 3 more rows
      </button>

      {error ? (
        <div className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
          <p>{error}</p>
          {rowErrors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {rowErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {created ? (
        <p className="text-sm font-medium text-emerald-800">
          Saved {created} products.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || filledCount === 0}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
      >
        {busy
          ? "Saving…"
          : `Save ${filledCount || ""} product${filledCount === 1 ? "" : "s"}`.trim()}
      </button>
    </form>
  );
}
