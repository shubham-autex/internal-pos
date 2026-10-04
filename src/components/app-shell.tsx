import Link from "next/link";
import type { ReactNode } from "react";
import { CartBadgeLink } from "@/components/cart-badge-link";

type AppShellProps = {
  children: ReactNode;
  email?: string | null;
};

export function AppShell({ children, email }: AppShellProps) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)]">
              Mela Stall
            </p>
            <p className="truncate text-xs text-[var(--ink-muted)]">
              Internal POS
              {email ? ` · ${email}` : ""}
            </p>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            <Link
              href="/products/new"
              className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)] sm:px-3"
            >
              Add
            </Link>
            <Link
              href="/orders"
              className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--surface-muted)] sm:px-3"
            >
              Orders
            </Link>
            <CartBadgeLink />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] sm:px-3"
              >
                Out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
    </div>
  );
}
