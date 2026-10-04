import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ProductGrid } from "@/components/product-grid";
import { loadActiveProducts } from "@/lib/load-products";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { products, error } = await loadActiveProducts(supabase);

  return (
    <AppShell email={user?.email}>
      {error ? (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">
          Could not load products: {error}. Run{" "}
          <code>supabase/schema.sql</code> and migrations for combo support.
        </div>
      ) : null}
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading…</p>}>
        <ProductGrid products={products} />
      </Suspense>
    </AppShell>
  );
}
