import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ProductForm } from "@/components/product-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
            Set cost and sell price. Scan QR/barcode into SKU during add.
          </p>
        </div>
        <ProductForm />
      </div>
    </AppShell>
  );
}
