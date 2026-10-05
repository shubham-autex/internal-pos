"use client";

import { useRouter } from "next/navigation";
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ClipboardEvent,
} from "react";
import { bulkSaveProducts } from "@/app/actions/products";
import { marginPercent } from "@/lib/money";
import { formatTagsInput } from "@/lib/tags";
import type { Product } from "@/lib/types";

type DraftRow = {
  key: string;
  id?: string;
  name: string;
  sku: string;
  cost_price: string;
  sell_price: string;
  discount_percent: string;
  expense_percent: string;
  stock: string;
  tags: string;
};

/** Columns that support multi-cell select + paste. */
type PasteField =
  | "name"
  | "sku"
  | "cost_price"
  | "sell_price"
  | "discount_percent"
  | "expense_percent"
  | "stock"
  | "tags";

const PASTE_FIELDS: PasteField[] = [
  "name",
  "sku",
  "cost_price",
  "sell_price",
  "discount_percent",
  "expense_percent",
  "stock",
  "tags",
];

type CellRef = { rowKey: string; field: PasteField };

function cellId(cell: CellRef) {
  return `${cell.rowKey}::${cell.field}`;
}

function parseCellId(id: string): CellRef | null {
  const sep = id.indexOf("::");
  if (sep < 0) return null;
  const rowKey = id.slice(0, sep);
  const field = id.slice(sep + 2) as PasteField;
  if (!PASTE_FIELDS.includes(field)) return null;
  return { rowKey, field };
}

const cellInputClass =
  "w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]";

const selectedCellClass =
  "ring-2 ring-[var(--accent)] ring-offset-1 bg-[var(--accent-soft)]/50";

function emptyRow(): DraftRow {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    sku: "",
    cost_price: "",
    sell_price: "",
    discount_percent: "0",
    expense_percent: "0",
    stock: "0",
    tags: "",
  };
}

function productToRow(product: Product): DraftRow {
  return {
    key: product.id,
    id: product.id,
    name: product.name,
    sku: product.sku,
    cost_price: String(product.cost_price ?? ""),
    sell_price: String(product.sell_price ?? ""),
    discount_percent: String(product.discount_percent ?? 0),
    expense_percent: String(product.expense_percent ?? 0),
    stock: String(product.stock ?? 0),
    tags: formatTagsInput(product.tags),
  };
}

function snapshot(row: DraftRow) {
  return [
    row.name.trim(),
    row.sku.trim(),
    row.cost_price.trim(),
    row.sell_price.trim(),
    row.discount_percent.trim() || "0",
    row.expense_percent.trim() || "0",
    row.stock.trim() || "0",
    row.tags.trim(),
  ].join("|");
}

function looksLikeHeader(cells: string[]) {
  const joined = cells.join(" ").toLowerCase();
  return (
    joined.includes("name") &&
    (joined.includes("sku") || joined.includes("barcode") || joined.includes("code"))
  );
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim());
  }
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
    const [
      name = "",
      sku = "",
      cost = "",
      sell = "",
      discount = "0",
      expense = "0",
      stock = "0",
      tags = "",
    ] = splitLine(line);
    return {
      ...emptyRow(),
      name,
      sku,
      cost_price: cost,
      sell_price: sell,
      discount_percent: discount || "0",
      expense_percent: expense || "0",
      stock: stock || "0",
      tags,
    };
  });
}

/** Parse clipboard into a grid of cell strings (rows × cols). */
function parseClipboardGrid(text: string): string[][] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.endsWith("\n") ? raw.slice(0, -1).split("\n") : raw.split("\n");
  if (lines.length === 1 && lines[0] === "") return [];
  return lines.map((line) => {
    if (line.includes("\t")) return line.split("\t");
    return [line];
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

function matchesQuery(row: DraftRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.name.toLowerCase().includes(q) ||
    row.sku.toLowerCase().includes(q) ||
    row.tags.toLowerCase().includes(q)
  );
}

export function BulkProductForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<DraftRow[]>(() => products.map(productToRow));
  const [baselines] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, snapshot(productToRow(p))])),
  );
  const [query, setQuery] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [bulkDisc, setBulkDisc] = useState("");
  const [bulkExp, setBulkExp] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<CellRef | null>(null);
  const tableShellRef = useRef<HTMLDivElement>(null);

  const visibleRows = useMemo(
    () => rows.filter((row) => matchesQuery(row, query)),
    [rows, query],
  );

  const dirtyRows = useMemo(() => {
    return rows.filter((row) => {
      if (!row.id) return rowHasContent(row);
      if (!rowHasContent(row)) return false;
      return snapshot(row) !== baselines[row.id];
    });
  }, [rows, baselines]);

  function updateRow(key: string, field: keyof DraftRow, value: string) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
    setSuccess(null);
  }

  function updateMany(
    updates: Array<{ rowKey: string; field: PasteField; value: string }>,
  ) {
    if (updates.length === 0) return;
    const byKey = new Map<string, Partial<Record<PasteField, string>>>();
    for (const u of updates) {
      const cur = byKey.get(u.rowKey) ?? {};
      cur[u.field] = u.value;
      byKey.set(u.rowKey, cur);
    }
    setRows((prev) =>
      prev.map((row) => {
        const patch = byKey.get(row.key);
        return patch ? { ...row, ...patch } : row;
      }),
    );
    setSuccess(null);
  }

  function applyFieldToShown(
    field: "discount_percent" | "expense_percent",
    value: string,
  ) {
    const trimmed = value.trim();
    if (trimmed === "") {
      setError(`Enter a ${field === "discount_percent" ? "Disc %" : "Exp %"} value`);
      return;
    }
    const keys = new Set(visibleRows.map((r) => r.key));
    if (keys.size === 0) {
      setError("No products shown to update");
      return;
    }
    setRows((prev) =>
      prev.map((row) => (keys.has(row.key) ? { ...row, [field]: trimmed } : row)),
    );
    setError(null);
    setSuccess(null);
  }

  function selectRange(from: CellRef, to: CellRef): Set<string> {
    const fromRow = visibleRows.findIndex((r) => r.key === from.rowKey);
    const toRow = visibleRows.findIndex((r) => r.key === to.rowKey);
    const fromCol = PASTE_FIELDS.indexOf(from.field);
    const toCol = PASTE_FIELDS.indexOf(to.field);
    if (fromRow < 0 || toRow < 0 || fromCol < 0 || toCol < 0) {
      return new Set([cellId(to)]);
    }
    const r0 = Math.min(fromRow, toRow);
    const r1 = Math.max(fromRow, toRow);
    const c0 = Math.min(fromCol, toCol);
    const c1 = Math.max(fromCol, toCol);
    const next = new Set<string>();
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        next.add(cellId({ rowKey: visibleRows[r].key, field: PASTE_FIELDS[c] }));
      }
    }
    return next;
  }

  function onCellMouseDown(
    event: MouseEvent<HTMLInputElement>,
    rowKey: string,
    field: PasteField,
  ) {
    const cell: CellRef = { rowKey, field };
    const id = cellId(cell);

    if (event.shiftKey && anchor) {
      event.preventDefault();
      setSelected(selectRange(anchor, cell));
      // Keep shell focused so Cmd/Ctrl+V paste works on multi-select.
      tableShellRef.current?.focus({ preventScroll: true });
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setAnchor(cell);
      tableShellRef.current?.focus({ preventScroll: true });
      return;
    }

    setSelected(new Set([id]));
    setAnchor(cell);
  }

  function onTablePaste(event: ClipboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    // Don't hijack paste inside the "Paste list" textarea.
    if (target?.closest("textarea")) return;

    const text = event.clipboardData.getData("text/plain");
    if (!text) return;

    const grid = parseClipboardGrid(text);
    if (grid.length === 0) return;

    const isSingleValue =
      grid.length === 1 && grid[0].length === 1 && !text.includes("\t");

    // Multi-select + single value → fill every selected cell.
    if (isSingleValue && selected.size > 1) {
      event.preventDefault();
      const value = grid[0][0];
      const updates: Array<{ rowKey: string; field: PasteField; value: string }> =
        [];
      for (const id of selected) {
        const cell = parseCellId(id);
        if (cell) updates.push({ ...cell, value });
      }
      updateMany(updates);
      return;
    }

    // Grid / column paste from the anchor (or sole selected) cell.
    const start =
      anchor ??
      (selected.size === 1
        ? parseCellId([...selected][0])
        : null);
    if (!start) return;

    const startRowIdx = visibleRows.findIndex((r) => r.key === start.rowKey);
    const startColIdx = PASTE_FIELDS.indexOf(start.field);
    if (startRowIdx < 0 || startColIdx < 0) return;

    // Only intercept when pasting a grid/column, or into a multi-select.
    // Single-cell single-value paste keeps native input behavior.
    if (isSingleValue && selected.size <= 1) return;

    event.preventDefault();

    const updates: Array<{ rowKey: string; field: PasteField; value: string }> =
      [];
    const nextSelected = new Set<string>();

    for (let r = 0; r < grid.length; r += 1) {
      const row = visibleRows[startRowIdx + r];
      if (!row) break;
      const cols = grid[r];
      for (let c = 0; c < cols.length; c += 1) {
        const field = PASTE_FIELDS[startColIdx + c];
        if (!field) break;
        updates.push({ rowKey: row.key, field, value: cols[c] });
        nextSelected.add(cellId({ rowKey: row.key, field }));
      }
    }

    updateMany(updates);
    if (nextSelected.size > 0) setSelected(nextSelected);
  }

  function onTableKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setSelected(new Set());
      setAnchor(null);
    }
  }

  function addRows(count = 1) {
    const next = Array.from({ length: count }, () => emptyRow());
    setRows((prev) => [...next, ...prev]);
    setSuccess(null);
  }

  function removeRow(row: DraftRow) {
    if (row.id) return;
    setRows((prev) => prev.filter((item) => item.key !== row.key));
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (!id.startsWith(`${row.key}::`)) next.add(id);
      }
      return next;
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
    setSuccess(null);
    setRows((prev) => [...parsed, ...prev]);
    setPasteOpen(false);
    setPasteText("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (dirtyRows.length === 0) return;

    setBusy(true);
    setError(null);
    setRowErrors([]);
    setSuccess(null);

    const payload = dirtyRows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      cost_price: row.cost_price,
      sell_price: row.sell_price,
      discount_percent: row.discount_percent || 0,
      expense_percent: row.expense_percent || 0,
      stock: row.stock || 0,
      tags: row.tags,
    }));

    const result = await bulkSaveProducts(payload);
    setBusy(false);

    if (!result.success) {
      setError(result.error ?? "Could not save products");
      setRowErrors(result.rowErrors ?? []);
      return;
    }

    const parts: string[] = [];
    if (result.created) parts.push(`${result.created} added`);
    if (result.updated) parts.push(`${result.updated} updated`);
    setSuccess(parts.length > 0 ? `Saved: ${parts.join(", ")}.` : "Saved.");
    router.refresh();

    // Reload table from server so new rows get ids.
    window.setTimeout(() => {
      window.location.assign("/products/bulk");
    }, 400);
  }

  function renderPasteCell(
    row: DraftRow,
    index: number,
    field: PasteField,
    opts: {
      label: string;
      className?: string;
      inputMode?: "decimal" | "numeric" | "text";
      placeholder?: string;
    },
  ) {
    const id = cellId({ rowKey: row.key, field });
    const isSelected = selected.has(id);
    return (
      <td className={`px-2 py-2 ${opts.className ?? ""}`}>
        <input
          aria-label={`${opts.label} row ${index + 1}`}
          value={row[field]}
          inputMode={opts.inputMode}
          placeholder={opts.placeholder}
          onMouseDown={(e) => onCellMouseDown(e, row.key, field)}
          onChange={(e) => updateRow(row.key, field, e.target.value)}
          onFocus={() => {
            if (selected.size <= 1) {
              setSelected(new Set([id]));
              setAnchor({ rowKey: row.key, field });
            }
          }}
          className={`${cellInputClass} ${isSelected ? selectedCellClass : ""}`}
        />
      </td>
    );
  }

  const saveDisabled = busy || dirtyRows.length === 0;
  const saveLabel = busy
    ? "Saving…"
    : dirtyRows.length === 0
      ? "No changes"
      : `Save ${dirtyRows.length} change${dirtyRows.length === 1 ? "" : "s"}`;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, SKU, or tag"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        />
      </label>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
        <p className="text-sm font-medium">Set Disc % / Exp % for all shown</p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Applies to the {visibleRows.length} product
          {visibleRows.length === 1 ? "" : "s"} currently visible
          {query.trim() ? " (filtered)" : ""}.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[8rem] flex-1">
            <span className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Disc %
            </span>
            <input
              value={bulkDisc}
              onChange={(e) => setBulkDisc(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 10"
              className={cellInputClass}
            />
          </label>
          <button
            type="button"
            onClick={() => applyFieldToShown("discount_percent", bulkDisc)}
            disabled={visibleRows.length === 0}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Apply Disc %
          </button>
          <label className="min-w-[8rem] flex-1">
            <span className="mb-1 block text-xs font-medium text-[var(--ink-muted)]">
              Exp %
            </span>
            <input
              value={bulkExp}
              onChange={(e) => setBulkExp(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 5"
              className={cellInputClass}
            />
          </label>
          <button
            type="button"
            onClick={() => applyFieldToShown("expense_percent", bulkExp)}
            disabled={visibleRows.length === 0}
            className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Apply Exp %
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--ink-muted)]">
          {visibleRows.length} shown
          {query.trim() ? ` · filtered` : ` · ${rows.length} total`}
          {dirtyRows.length > 0 ? ` · ${dirtyRows.length} changed` : ""}
          {selected.size > 0 ? ` · ${selected.size} cell${selected.size === 1 ? "" : "s"} selected` : ""}
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
          <button
            type="submit"
            disabled={saveDisabled}
            className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
          >
            {saveLabel}
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--ink-muted)]">
        Select cells: click · Shift+click range · ⌘/Ctrl+click multi. Paste a
        value into selected cells, or paste a column/grid from Excel starting at
        the active cell. Esc clears selection.
      </p>

      {pasteOpen ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-sm font-medium">Paste from Excel / CSV</p>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            New rows are added on top. Format: Name, SKU, Cost, Sell, Disc %,
            Expense %, Stock, Tags
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder={'Masala Chai, CHAI-01, 8, 20, 0, 0, 200, "drink, hot"'}
            className="mt-3 w-full resize-y rounded-xl border border-[var(--line)] px-3 py-2.5 font-mono text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          />
          <button
            type="button"
            onClick={applyPaste}
            className="mt-3 w-full rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--surface)]"
          >
            Add pasted rows on top
          </button>
        </div>
      ) : null}

      <div
        ref={tableShellRef}
        tabIndex={0}
        className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        onPaste={onTablePaste}
        onKeyDown={onTableKeyDown}
      >
        <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--ink-muted)]">
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--surface-muted)] px-3 py-3 font-medium">
                #
              </th>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">SKU</th>
              <th className="px-3 py-3 font-medium">Cost ₹</th>
              <th className="px-3 py-3 font-medium">Sell ₹</th>
              <th className="px-3 py-3 font-medium">Disc %</th>
              <th className="px-3 py-3 font-medium">Exp %</th>
              <th className="px-3 py-3 font-medium">Profit %</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Tags</th>
              <th className="px-3 py-3 font-medium">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]"
                >
                  {query.trim()
                    ? "No products match this search."
                    : "No products yet. Use + Row to add some."}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, index) => {
                const dirty =
                  !row.id
                    ? rowHasContent(row)
                    : snapshot(row) !== baselines[row.id];
                return (
                  <tr
                    key={row.key}
                    className={`border-t border-[var(--line)] ${
                      dirty ? "bg-[var(--accent-soft)]/40" : ""
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-[inherit] px-3 py-2 text-xs font-semibold text-[var(--ink-muted)]">
                      {index + 1}
                      {!row.id ? (
                        <span className="ml-1 text-[10px] uppercase text-[var(--accent-ink)]">
                          new
                        </span>
                      ) : null}
                    </td>
                    {renderPasteCell(row, index, "name", {
                      label: "Name",
                      className: "min-w-[10rem]",
                    })}
                    {renderPasteCell(row, index, "sku", {
                      label: "SKU",
                      className: "min-w-[8rem]",
                    })}
                    {renderPasteCell(row, index, "cost_price", {
                      label: "Cost",
                      className: "w-24",
                      inputMode: "decimal",
                    })}
                    {renderPasteCell(row, index, "sell_price", {
                      label: "Sell",
                      className: "w-24",
                      inputMode: "decimal",
                    })}
                    {renderPasteCell(row, index, "discount_percent", {
                      label: "Discount percent",
                      className: "w-20",
                      inputMode: "decimal",
                    })}
                    {renderPasteCell(row, index, "expense_percent", {
                      label: "Expense percent",
                      className: "w-20",
                      inputMode: "decimal",
                    })}
                    <td className="w-20 px-2 py-2 text-center text-sm font-semibold tabular-nums">
                      {marginPercent(
                        Number(row.sell_price) || 0,
                        Number(row.cost_price) || 0,
                        Number(row.expense_percent) || 0,
                        Number(row.discount_percent) || 0,
                      )}
                      %
                    </td>
                    {renderPasteCell(row, index, "stock", {
                      label: "Stock",
                      className: "w-20",
                      inputMode: "numeric",
                    })}
                    {renderPasteCell(row, index, "tags", {
                      label: "Tags",
                      className: "min-w-[9rem]",
                      placeholder: "snack, hot",
                    })}
                    <td className="px-2 py-2">
                      {!row.id ? (
                        <button
                          type="button"
                          onClick={() => removeRow(row)}
                          className="rounded-lg px-2 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                          aria-label={`Remove row ${index + 1}`}
                        >
                          ×
                        </button>
                      ) : (
                        <span className="px-2 text-xs text-[var(--ink-muted)]">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => addRows(5)}
        className="w-full rounded-xl border border-dashed border-[var(--line)] px-4 py-3 text-sm font-semibold"
      >
        + Add 5 rows on top
      </button>

      {error ? (
        <div
          className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800"
          role="alert"
        >
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

      {success ? (
        <p className="text-sm font-medium text-emerald-800">{success}</p>
      ) : null}

      <button
        type="submit"
        disabled={saveDisabled}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
      >
        {saveLabel}
      </button>
    </form>
  );
}
