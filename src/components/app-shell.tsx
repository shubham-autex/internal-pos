import Link from "next/link";
import type { ReactNode } from "react";
import { CartBadgeLink } from "@/components/cart-badge-link";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

type AppShellProps = {
  children: ReactNode;
  email?: string | null;
};

export function AppShell({ children, email }: AppShellProps) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <Link href="/" className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--ink)] sm:text-xl">
              Mela Stall
            </p>
            <p className="hidden truncate text-xs text-[var(--ink-muted)] sm:block">
              Internal POS
              {email ? ` · ${email}` : ""}
            </p>
          </Link>
          <nav className="hidden items-center justify-end gap-1 sm:flex sm:gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink)] active:bg-[var(--surface-muted)] sm:px-3"
            >
              Dashboard
            </Link>
            <Link
              href="/products"
              className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink)] active:bg-[var(--surface-muted)] sm:px-3"
            >
              Products
            </Link>
            <Link
              href="/orders"
              className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink)] active:bg-[var(--surface-muted)] sm:px-3"
            >
              Orders
            </Link>
            <CartBadgeLink />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink-muted)] active:bg-[var(--surface-muted)] sm:px-3"
              >
                Out
              </button>
            </form>
          </nav>
          <form action="/auth/signout" method="post" className="sm:hidden">
            <button
              type="submit"
              className="rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--ink-muted)] active:bg-[var(--surface-muted)]"
            >
              Out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-3 pb-20 sm:px-4 sm:py-5 sm:pb-5">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
