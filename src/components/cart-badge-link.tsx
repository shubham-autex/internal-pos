"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartBadgeLink() {
  const { itemCount } = useCart();
  return (
    <Link
      href="/checkout"
      className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
    >
      Cart{itemCount > 0 ? ` (${itemCount})` : ""}
    </Link>
  );
}
