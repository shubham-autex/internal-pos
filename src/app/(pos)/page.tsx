import { Suspense } from "react";
import { ProductGrid } from "@/components/product-grid";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name");

  const products = (data ?? []) as Product[];

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">
          Could not load products: {error.message}. Run{" "}
          <code>supabase/schema.sql</code> and <code>supabase/seed.sql</code>.
        </div>
      ) : null}
      <Suspense fallback={<p className="text-sm text-[var(--ink-muted)]">Loading…</p>}>
        <ProductGrid products={products} />
      </Suspense>
    </>
  );
}
