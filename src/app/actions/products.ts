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
