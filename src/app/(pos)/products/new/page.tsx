import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          Add product
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Set cost and sell price. Scan QR/barcode into SKU during add.
        </p>
      </div>
      <ProductForm />
    </div>
  );
}
