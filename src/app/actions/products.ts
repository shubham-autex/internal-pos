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
  stock: z.coerce.number().int().min(0).default(0),
});

export type ProductActionState = {
  error?: string;
  success?: boolean;
  productId?: string;
};

export async function createProduct(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    description: formData.get("description") || undefined,
    cost_price: formData.get("cost_price"),
    sell_price: formData.get("sell_price"),
    stock: formData.get("stock") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  revalidatePath("/");
  revalidatePath("/products/new");
  return { success: true, productId: data.id };
}
