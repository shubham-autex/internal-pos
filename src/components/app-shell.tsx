"use client";

import type { ReactNode } from "react";
import { NavTab } from "@/components/nav-tab";
import { useCart } from "@/components/cart-provider";

type AppShellProps = {
  children: ReactNode;
  email?: string | null;
};

export function AppShell({ children, email }: AppShellProps) {
  const { itemCount } = useCart();

  return (
    <div className="app-shell min-h-full">
      <header className="app-header">
        <div className="mx-auto flex h-[var(--app-header)] max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)]">
              Mela Stall
            </p>
            {email ? (
              <p className="hidden truncate text-[11px] text-[var(--ink-muted)] sm:block">
                {email}
              </p>
            ) : null}
          </div>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            <NavTab href="/" label="Sell" exact />
            <NavTab href="/products/new" label="Add" />
            <NavTab href="/orders" label="Orders" />
            <NavTab
              href="/checkout"
              label="Cart"
              badge={
                itemCount > 0 ? (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] text-[var(--accent-ink)]">
                    {itemCount}
                  </span>
                ) : null
              }
            />
          </nav>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-xl px-3 py-2 text-sm font-medium text-[var(--ink-muted)] active:bg-[var(--surface-muted)]"
            >
              Out
            </button>
          </form>
        </div>
      </header>

      <main className="app-main mx-auto max-w-6xl px-3 sm:px-4">
        {children}
      </main>

      <nav className="app-tabbar sm:hidden" aria-label="Main">
        <div className="mx-auto flex max-w-6xl items-stretch gap-1 px-2">
          <NavTab href="/" label="Sell" exact />
          <NavTab href="/products/new" label="Add" />
          <NavTab href="/orders" label="Orders" />
          <NavTab
            href="/checkout"
            label="Cart"
            badge={
              itemCount > 0 ? (
                <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] text-[var(--accent-ink)]">
                  {itemCount}
                </span>
              ) : null
            }
          />
        </div>
      </nav>
    </div>
  );
}
