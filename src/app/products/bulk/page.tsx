import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BulkProductForm } from "@/components/bulk-product-form";
import { loadActiveProducts } from "@/lib/load-products";
import { createClient } from "@/lib/supabase/server";

export default async function BulkProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { products, error } = await loadActiveProducts(supabase);
  const simpleProducts = products.filter((product) => product.kind !== "combo");

  return (
    <AppShell email={user?.email}>
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--ink-muted)] hover:underline"
          >
            ← Products
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            Bulk add
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Edit simple products in the table, or add new rows on top. Combos
            are edited from the product page.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <BulkProductForm products={simpleProducts} />
      </div>
    </AppShell>
  );
}
