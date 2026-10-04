import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProductList } from "@/components/product-list";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name");

  const products = (data ?? []) as Product[];

  return (
    <AppShell email={user?.email}>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Products
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Create, edit, or remove stall items.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/products/bulk"
              className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold"
            >
              Bulk add
            </Link>
            <Link
              href="/products/new"
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)]"
            >
              Add
            </Link>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">
            {error.message}
          </p>
        ) : null}

        <ProductList products={products} />
      </div>
    </AppShell>
  );
}
