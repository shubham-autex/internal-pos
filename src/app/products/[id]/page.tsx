import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProductForm } from "@/components/product-form";
import { loadActiveProducts, loadProductWithComponents } from "@/lib/load-products";
import { createClient } from "@/lib/supabase/server";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ product, error }, { products }] = await Promise.all([
    loadProductWithComponents(supabase, id),
    loadActiveProducts(supabase),
  ]);

  if (error || !product) {
    notFound();
  }

  const simpleProducts = products.filter(
    (item) => item.kind !== "combo" && item.id !== product.id,
  );
  const isCombo = product.kind === "combo";

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
            Edit {isCombo ? "combo" : "product"}
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            {isCombo
              ? `Buildable from components: ${product.stock}.`
              : `Stock left: ${product.stock}.`}
          </p>
        </div>
        <ProductForm product={product} simpleProducts={simpleProducts} />
      </div>
    </AppShell>
  );
}
