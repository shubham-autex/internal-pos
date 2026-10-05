"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatINR } from "@/lib/money";
import type { Product } from "@/lib/types";

type ComboItemPickerProps = {
  products: Product[];
  onAdd: (productIds: string[]) => void;
};

export function ComboItemPicker({ products, onAdd }: ComboItemPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.includes(q)),
    );
  }, [products, query]);

  useEffect(() => {
    // Drop selections that are no longer available (already added to combo).
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (products.some((item) => item.id === id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (!(e.target instanceof Node)) return;
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSelected() {
    if (selected.size === 0) return;
    onAdd([...selected]);
    setSelected(new Set());
    setQuery("");
    setOpen(false);
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of filtered) next.add(item.id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedCount = selected.size;
  const summary =
    selectedCount === 0
      ? "Search & select products…"
      : `${selectedCount} selected`;

  return (
    <div ref={rootRef} className="relative space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((v) => !v);
          window.setTimeout(() => searchRef.current?.focus(), 0);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-left text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span
          className={
            selectedCount > 0
              ? "font-semibold text-[var(--ink)]"
              : "text-[var(--ink-muted)]"
          }
        >
          {summary}
        </span>
        <span className="shrink-0 text-[var(--ink-muted)]" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          id={listId}
          className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-lg"
        >
          <div className="border-b border-[var(--line)] p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU, or tag…"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
              autoComplete="off"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllFiltered}
                disabled={filtered.length === 0}
                className="rounded-lg px-2 py-1 font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
              >
                Select all{filtered.length > 0 ? ` (${filtered.length})` : ""}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedCount === 0}
                className="rounded-lg px-2 py-1 font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
              >
                Clear
              </button>
              <span className="ml-auto text-[var(--ink-muted)]">
                {filtered.length} shown · {products.length} available
              </span>
            </div>
          </div>

          <ul
            role="listbox"
            aria-multiselectable="true"
            className="max-h-56 overflow-y-auto overscroll-contain sm:max-h-72"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--ink-muted)]">
                {products.length === 0
                  ? "All products are already in this combo."
                  : "No matches."}
              </li>
            ) : (
              filtered.map((item) => {
                const isOn = selected.has(item.id);
                return (
                  <li key={item.id} role="option" aria-selected={isOn}>
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        isOn
                          ? "bg-[var(--accent-soft)]/70"
                          : "hover:bg-[var(--surface-muted)]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                          isOn
                            ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--surface)]"
                            : "border-[var(--line)] bg-[var(--surface)] text-transparent"
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
                          {item.sku} · {formatINR(Number(item.sell_price))} ·
                          stock {Math.max(0, Math.floor(Number(item.stock) || 0))}
                        </span>
                        {item.tags.length > 0 ? (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {item.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-[var(--line)] p-2">
            <button
              type="button"
              onClick={addSelected}
              disabled={selectedCount === 0}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
            >
              {selectedCount === 0
                ? "Select items to add"
                : `Add ${selectedCount} item${selectedCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
