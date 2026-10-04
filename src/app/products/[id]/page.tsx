import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProductForm } from "@/components/product-form";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

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

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const product = data as Product;

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
            Edit product
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Update price, stock, or SKU. Stock left: {product.stock}.
          </p>
        </div>
        <ProductForm product={product} />
      </div>
    </AppShell>
  );
}
