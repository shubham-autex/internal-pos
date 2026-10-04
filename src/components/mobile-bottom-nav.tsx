"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";

const tabs = [
  { href: "/", label: "Sell", match: (path: string) => path === "/" },
  {
    href: "/orders",
    label: "Orders",
    match: (path: string) => path.startsWith("/orders"),
  },
  {
    href: "/checkout",
    label: "Cart",
    match: (path: string) => path.startsWith("/checkout"),
  },
  {
    href: "/products",
    label: "Products",
    match: (path: string) => path.startsWith("/products"),
  },
] as const;

function TabIcon({ label, active }: { label: string; active: boolean }) {
  const stroke = active ? "var(--ink)" : "var(--ink-muted)";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (label) {
    case "Sell":
      return (
        <svg {...common}>
          <path d="M4 7h16l-1.2 12.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
      );
    case "Orders":
      return (
        <svg {...common}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      );
    case "Cart":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1" fill={stroke} stroke="none" />
          <circle cx="18" cy="20" r="1" fill={stroke} stroke="none" />
          <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H7" />
        </svg>
      );
    case "Products":
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    default:
      return null;
  }
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-6xl grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                prefetch
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                  active ? "text-[var(--ink)]" : "text-[var(--ink-muted)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <TabIcon label={tab.label} active={active} />
                  {tab.label === "Cart" && itemCount > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold leading-none text-[var(--accent-ink)]">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  ) : null}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
