"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavTabProps = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: ReactNode;
};

function TabLabel({
  label,
  active,
  badge,
}: {
  label: string;
  active: boolean;
  badge?: ReactNode;
}) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-semibold sm:min-h-10 sm:flex-row sm:gap-1.5 sm:text-sm ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
          : "text-[var(--ink-muted)]"
      } ${pending ? "opacity-70" : ""}`}
    >
      <span>{label}</span>
      {badge}
      {pending ? (
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)] sm:static sm:ml-1"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

export function NavTab({ href, label, exact = false, badge }: NavTabProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className="flex min-w-0 flex-1"
    >
      <TabLabel label={label} active={active} badge={badge} />
    </Link>
  );
}
