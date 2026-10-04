import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProductForm } from "@/components/product-form";
import { loadActiveProducts } from "@/lib/load-products";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { products } = await loadActiveProducts(supabase);
  const simpleProducts = products.filter((product) => product.kind !== "combo");

  return (
    <AppShell email={user?.email}>
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--ink-muted)] hover:underline"
          >
            ← Products
          </Link>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold">
            Add product
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Simple item or combo. Combos use their own sell price; cost and
            expense come from selected products.
          </p>
        </div>
        <ProductForm simpleProducts={simpleProducts} />
      </div>
    </AppShell>
  );
}
