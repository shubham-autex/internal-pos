"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().min(1, "SKU / barcode is required"),
  description: z.string().trim().optional(),
  cost_price: z.coerce.number().min(0, "Cost must be 0 or more"),
  sell_price: z.coerce.number().min(0, "Sell price must be 0 or more"),
  expense_percent: z.coerce
    .number()
    .min(0, "Expense % must be 0 or more")
    .max(100, "Expense % cannot exceed 100")
    .default(0),
  stock: z.coerce.number().int().min(0).default(0),
});

export type ProductActionState = {
  error?: string;
  success?: boolean;
  productId?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    description: formData.get("description") || undefined,
    cost_price: formData.get("cost_price"),
    sell_price: formData.get("sell_price"),
    expense_percent: formData.get("expense_percent") || 0,
    stock: formData.get("stock") || 0,
  });
}

function revalidateProductPaths(productId?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/new");
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export async function createProduct(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      sku: parsed.data.sku,
      description: parsed.data.description ?? null,
      cost_price: parsed.data.cost_price,
      sell_price: parsed.data.sell_price,
      expense_percent: parsed.data.expense_percent,
      stock: parsed.data.stock,
      active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with this SKU already exists" };
    }
    return { error: error.message };
  }

  revalidateProductPaths(data.id);
  return { success: true, productId: data.id };
}

export async function updateProduct(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const productId = String(formData.get("id") ?? "");
  if (!productId) {
    return { error: "Missing product id" };
  }

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku,
      description: parsed.data.description ?? null,
      cost_price: parsed.data.cost_price,
      sell_price: parsed.data.sell_price,
      expense_percent: parsed.data.expense_percent,
      stock: parsed.data.stock,
    })
    .eq("id", productId);

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with this SKU already exists" };
    }
    return { error: error.message };
  }

  revalidateProductPaths(productId);
  return { success: true, productId };
}

export async function deleteProduct(productId: string): Promise<ProductActionState> {
  if (!productId) {
    return { error: "Missing product id" };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("products")
    .update({ active: false })
    .eq("id", productId);

  if (error) {
    return { error: error.message };
  }

  revalidateProductPaths(productId);
  return { success: true, productId };
}

const bulkRowSchema = productSchema;

export type BulkProductActionResult = {
  error?: string;
  success?: boolean;
  created?: number;
  rowErrors?: string[];
};

export async function bulkCreateProducts(
  rows: unknown[],
): Promise<BulkProductActionResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Add at least one product row" };
  }

  if (rows.length > 200) {
    return { error: "You can add at most 200 products at once" };
  }

  const parsedRows: z.infer<typeof bulkRowSchema>[] = [];
  const rowErrors: string[] = [];
  const seenSkus = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = bulkRowSchema.safeParse(row);
    if (!parsed.success) {
      rowErrors.push(
        `Row ${index + 1}: ${parsed.error.issues[0]?.message ?? "Invalid"}`,
      );
      return;
    }
    const skuKey = parsed.data.sku.toLowerCase();
    if (seenSkus.has(skuKey)) {
      rowErrors.push(`Row ${index + 1}: Duplicate SKU “${parsed.data.sku}” in this list`);
      return;
    }
    seenSkus.add(skuKey);
    parsedRows.push(parsed.data);
  });

  if (rowErrors.length > 0) {
    return { error: "Fix the highlighted rows, then try again", rowErrors };
  }

  if (parsedRows.length === 0) {
    return { error: "Add at least one product row" };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("products")
    .insert(
      parsedRows.map((row) => ({
        name: row.name,
        sku: row.sku,
        description: row.description ?? null,
        cost_price: row.cost_price,
        sell_price: row.sell_price,
        expense_percent: row.expense_percent,
        stock: row.stock,
        active: true,
      })),
    )
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return {
        error: "One or more SKUs already exist. Use unique SKUs and try again.",
      };
    }
    return { error: error.message };
  }

  revalidateProductPaths();
  revalidatePath("/products/bulk");
  return { success: true, created: data?.length ?? parsedRows.length };
}
