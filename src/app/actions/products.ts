"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deriveComboCosting } from "@/lib/combo";
import { createClient } from "@/lib/supabase/server";
import { parseTagsInput } from "@/lib/tags";
import type { ProductKind } from "@/lib/types";

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sku: z.string().trim().min(1, "SKU / barcode is required"),
  description: z.string().trim().optional(),
  kind: z.enum(["simple", "combo"]).default("simple"),
  cost_price: z.coerce.number().min(0, "Cost must be 0 or more"),
  sell_price: z.coerce.number().min(0, "Sell price must be 0 or more"),
  discount_percent: z.coerce
    .number()
    .min(0, "Discount % must be 0 or more")
    .max(100, "Discount % cannot exceed 100")
    .default(0),
  expense_percent: z.coerce
    .number()
    .min(0, "Expense % must be 0 or more")
    .max(100, "Expense % cannot exceed 100")
    .default(0),
  stock: z.coerce.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
});

const componentSchema = z.object({
  component_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
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

function parseComponents(formData: FormData) {
  const raw = String(formData.get("components_json") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false as const, error: "Invalid combo components" };
  }
  const result = z.array(componentSchema).safeParse(parsed);
  if (!result.success) {
    return { success: false as const, error: "Invalid combo components" };
  }
  return { success: true as const, data: result.data };
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    description: formData.get("description") || undefined,
    kind: formData.get("kind") || "simple",
    cost_price: formData.get("cost_price"),
    sell_price: formData.get("sell_price"),
    discount_percent: formData.get("discount_percent") || 0,
    expense_percent: formData.get("expense_percent") || 0,
    stock: formData.get("stock") || 0,
    tags: parseTagsInput(String(formData.get("tags") ?? "")),
  });
}

function revalidateProductPaths(productId?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/new");
  revalidatePath("/products/bulk");
  revalidatePath("/dashboard");
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

async function resolveComboFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  components: Array<{ component_id: string; quantity: number }>,
  excludeProductId?: string,
) {
  if (components.length === 0) {
    return { error: "Add at least one product to the combo" as const };
  }

  const ids = [...new Set(components.map((c) => c.component_id))];
  if (excludeProductId && ids.includes(excludeProductId)) {
    return { error: "A combo cannot include itself" as const };
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, kind, active, cost_price, sell_price, expense_percent")
    .in("id", ids)
    .eq("active", true);

  if (error) return { error: error.message as string };

  const byId = new Map((data ?? []).map((row) => [String(row.id), row]));
  const costingInputs = [];

  for (const component of components) {
    const row = byId.get(component.component_id);
    if (!row) {
      return { error: "One or more combo items were not found" as const };
    }
    if (String(row.kind || "simple") !== "simple") {
      return {
        error: `“${row.name}” is a combo — only simple products can be included` as const,
      };
    }
    costingInputs.push({
      cost_price: Number(row.cost_price) || 0,
      sell_price: Number(row.sell_price) || 0,
      expense_percent: Number(row.expense_percent) || 0,
      quantity: component.quantity,
    });
  }

  const derived = deriveComboCosting(costingInputs);
  return {
    cost_price: derived.cost_price,
    expense_percent: derived.expense_percent,
    components,
  };
}

async function replaceComponents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  comboId: string,
  components: Array<{ component_id: string; quantity: number }>,
) {
  const { error: deleteError } = await supabase
    .from("product_components")
    .delete()
    .eq("combo_id", comboId);
  if (deleteError) return deleteError.message;

  if (components.length === 0) return null;

  const { error: insertError } = await supabase.from("product_components").insert(
    components.map((component) => ({
      combo_id: comboId,
      component_id: component.component_id,
      quantity: component.quantity,
    })),
  );
  return insertError?.message ?? null;
}

async function recomputeCombosUsingComponent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  componentId: string,
) {
  const { data: links, error } = await supabase
    .from("product_components")
    .select("combo_id")
    .eq("component_id", componentId);

  if (error || !links?.length) return;

  const comboIds = [...new Set(links.map((row) => String(row.combo_id)))];

  for (const comboId of comboIds) {
    const { data: combo } = await supabase
      .from("products")
      .select("id, sell_price, active, kind")
      .eq("id", comboId)
      .maybeSingle();
    if (!combo || !combo.active || String(combo.kind) !== "combo") continue;

    const { data: bom } = await supabase
      .from("product_components")
      .select("component_id, quantity")
      .eq("combo_id", comboId);

    const resolved = await resolveComboFields(
      supabase,
      (bom ?? []).map((row) => ({
        component_id: String(row.component_id),
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
      })),
      comboId,
    );
    if ("error" in resolved && resolved.error) continue;

    await supabase
      .from("products")
      .update({
        cost_price: resolved.cost_price,
        expense_percent: resolved.expense_percent,
      })
      .eq("id", comboId);
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

  const kind = parsed.data.kind as ProductKind;
  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  let cost_price = parsed.data.cost_price;
  let expense_percent = parsed.data.expense_percent;
  let stock = parsed.data.stock;
  let components: Array<{ component_id: string; quantity: number }> = [];

  if (kind === "combo") {
    const bom = parseComponents(formData);
    if (!bom.success) return { error: bom.error };
    const resolved = await resolveComboFields(
      supabase,
      bom.data,
    );
    if ("error" in resolved && resolved.error) {
      return { error: resolved.error };
    }
    cost_price = resolved.cost_price!;
    expense_percent = resolved.expense_percent!;
    components = resolved.components!;
    stock = 0;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      sku: parsed.data.sku,
      description: parsed.data.description ?? null,
      kind,
      cost_price,
      sell_price: parsed.data.sell_price,
      discount_percent: parsed.data.discount_percent,
      expense_percent,
      stock,
      tags: parsed.data.tags,
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

  if (kind === "combo") {
    const bomError = await replaceComponents(supabase, data.id, components);
    if (bomError) {
      await supabase.from("products").delete().eq("id", data.id);
      return { error: bomError };
    }
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

  const kind = parsed.data.kind as ProductKind;
  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id, kind")
    .eq("id", productId)
    .maybeSingle();

  if (!existing) {
    return { error: "Product not found" };
  }

  // Keep kind stable on edit (don't convert simple↔combo here).
  const effectiveKind = (String(existing.kind || "simple") as ProductKind) || kind;

  let cost_price = parsed.data.cost_price;
  let expense_percent = parsed.data.expense_percent;
  let stock = parsed.data.stock;
  let components: Array<{ component_id: string; quantity: number }> = [];

  if (effectiveKind === "combo") {
    const bom = parseComponents(formData);
    if (!bom.success) return { error: bom.error };
    const resolved = await resolveComboFields(
      supabase,
      bom.data,
      productId,
    );
    if ("error" in resolved && resolved.error) {
      return { error: resolved.error };
    }
    cost_price = resolved.cost_price!;
    expense_percent = resolved.expense_percent!;
    components = resolved.components!;
    stock = 0;
  }

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku,
      description: parsed.data.description ?? null,
      kind: effectiveKind,
      cost_price,
      sell_price: parsed.data.sell_price,
      discount_percent: parsed.data.discount_percent,
      expense_percent,
      stock,
      tags: parsed.data.tags,
    })
    .eq("id", productId);

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with this SKU already exists" };
    }
    return { error: error.message };
  }

  if (effectiveKind === "combo") {
    const bomError = await replaceComponents(supabase, productId, components);
    if (bomError) return { error: bomError };
  } else {
    await recomputeCombosUsingComponent(supabase, productId);
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

  const { count } = await supabase
    .from("product_components")
    .select("*", { count: "exact", head: true })
    .eq("component_id", productId);

  if ((count ?? 0) > 0) {
    return {
      error: "This product is used in a combo. Remove it from combos first.",
    };
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

const bulkRowSchema = productSchema.omit({ kind: true }).extend({
  id: z.string().uuid().optional(),
});

export type BulkProductActionResult = {
  error?: string;
  success?: boolean;
  created?: number;
  updated?: number;
  rowErrors?: string[];
};

export async function bulkSaveProducts(
  rows: unknown[],
): Promise<BulkProductActionResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Nothing to save" };
  }

  if (rows.length > 500) {
    return { error: "You can save at most 500 rows at once" };
  }

  type ParsedBulkRow = z.infer<typeof bulkRowSchema>;
  const parsedRows: ParsedBulkRow[] = [];
  const rowErrors: string[] = [];
  const seenSkus = new Set<string>();

  rows.forEach((row, index) => {
    const raw =
      row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const parsed = bulkRowSchema.safeParse({
      ...raw,
      tags: parseTagsInput(
        Array.isArray(raw.tags)
          ? raw.tags.map((tag) => String(tag ?? "")).join(",")
          : String(raw.tags ?? ""),
      ),
    });
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
    return { error: "Nothing to save" };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const toCreate = parsedRows.filter((row) => !row.id);
  const toUpdate = parsedRows.filter((row) => Boolean(row.id));

  if (toCreate.length > 200) {
    return { error: "You can add at most 200 new products at once" };
  }

  let created = 0;
  let updated = 0;

  if (toCreate.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .insert(
        toCreate.map((row) => ({
          name: row.name,
          sku: row.sku,
          description: row.description ?? null,
          kind: "simple",
          cost_price: row.cost_price,
          sell_price: row.sell_price,
          discount_percent: row.discount_percent,
          expense_percent: row.expense_percent,
          stock: row.stock,
          tags: row.tags,
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
    created = data?.length ?? toCreate.length;
  }

  for (const row of toUpdate) {
    const { data: existing } = await supabase
      .from("products")
      .select("kind")
      .eq("id", row.id!)
      .maybeSingle();

    if (existing && String(existing.kind) === "combo") {
      return {
        error: `“${row.name}” is a combo — edit it from the product page, not bulk.`,
      };
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: row.name,
        sku: row.sku,
        description: row.description ?? null,
        cost_price: row.cost_price,
        sell_price: row.sell_price,
        discount_percent: row.discount_percent,
        expense_percent: row.expense_percent,
        stock: row.stock,
        tags: row.tags,
      })
      .eq("id", row.id!);

    if (error) {
      if (error.code === "23505") {
        return {
          error: `SKU “${row.sku}” already exists on another product.`,
        };
      }
      return { error: error.message };
    }
    updated += 1;
    await recomputeCombosUsingComponent(supabase, row.id!);
  }

  revalidateProductPaths();
  return { success: true, created, updated };
}
