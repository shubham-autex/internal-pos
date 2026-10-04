import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BulkProductForm } from "@/components/bulk-product-form";
import { createClient } from "@/lib/supabase/server";

export default async function BulkProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
            Add many products at once, or paste a CSV / Excel list.
          </p>
        </div>
        <BulkProductForm />
      </div>
    </AppShell>
  );
}
