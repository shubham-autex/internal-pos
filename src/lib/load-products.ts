import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichComboStock } from "@/lib/combo";
import type { Product, ProductComponentRef, ProductKind } from "@/lib/types";

function asProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    description: (row.description as string | null) ?? null,
    kind: (row.kind as ProductKind) || "simple",
    cost_price: Number(row.cost_price) || 0,
    sell_price: Number(row.sell_price) || 0,
    expense_percent: Number(row.expense_percent) || 0,
    stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
    active: Boolean(row.active),
    created_at: String(row.created_at ?? ""),
  };
}

export async function loadActiveProducts(
  supabase: SupabaseClient,
): Promise<{ products: Product[]; error: string | null }> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) {
    return { products: [], error: error.message };
  }

  const products = (data ?? []).map((row) => asProduct(row as Record<string, unknown>));
  const byId = new Map(products.map((product) => [product.id, product]));
  const comboIds = products
    .filter((product) => product.kind === "combo")
    .map((product) => product.id);

  if (comboIds.length === 0) {
    return { products, error: null };
  }

  const { data: bomRows, error: bomError } = await supabase
    .from("product_components")
    .select("combo_id, component_id, quantity")
    .in("combo_id", comboIds);

  if (bomError) {
    return { products, error: bomError.message };
  }

  const componentIds = [
    ...new Set((bomRows ?? []).map((row) => String(row.component_id))),
  ];

  let componentById = new Map<string, Product>();
  if (componentIds.length > 0) {
    const { data: componentRows } = await supabase
      .from("products")
      .select("*")
      .in("id", componentIds);
    componentById = new Map(
      (componentRows ?? []).map((row) => {
        const product = asProduct(row as Record<string, unknown>);
        return [product.id, product];
      }),
    );
  }

  const componentsByCombo = new Map<string, ProductComponentRef[]>();
  for (const row of bomRows ?? []) {
    const comboId = String(row.combo_id);
    const componentId = String(row.component_id);
    const component = componentById.get(componentId) ?? byId.get(componentId);
    const list = componentsByCombo.get(comboId) ?? [];
    list.push({
      component_id: componentId,
      quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
      name: component?.name,
      sku: component?.sku,
      cost_price: component?.cost_price,
      sell_price: component?.sell_price,
      expense_percent: component?.expense_percent,
      stock: component?.stock,
    });
    componentsByCombo.set(comboId, list);
  }

  const enriched = products.map((product) => {
    if (product.kind !== "combo") return product;
    const components = componentsByCombo.get(product.id) ?? [];
    return {
      ...product,
      components,
      stock: enrichComboStock(components, 0),
    };
  });

  return { products: enriched, error: null };
}

export async function loadProductWithComponents(
  supabase: SupabaseClient,
  productId: string,
): Promise<{ product: Product | null; error: string | null }> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("active", true)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  if (!data) return { product: null, error: null };

  const product = asProduct(data as Record<string, unknown>);
  if (product.kind !== "combo") {
    return { product, error: null };
  }

  const { data: bomRows, error: bomError } = await supabase
    .from("product_components")
    .select("component_id, quantity")
    .eq("combo_id", productId);

  if (bomError) return { product, error: bomError.message };

  const componentIds = (bomRows ?? []).map((row) => String(row.component_id));
  let componentById = new Map<string, Product>();
  if (componentIds.length > 0) {
    const { data: componentRows } = await supabase
      .from("products")
      .select("*")
      .in("id", componentIds);
    componentById = new Map(
      (componentRows ?? []).map((row) => {
        const item = asProduct(row as Record<string, unknown>);
        return [item.id, item];
      }),
    );
  }

  const components: ProductComponentRef[] = (bomRows ?? []).map((row) => {
    const component = componentById.get(String(row.component_id));
    return {
      component_id: String(row.component_id),
      quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
      name: component?.name,
      sku: component?.sku,
      cost_price: component?.cost_price,
      sell_price: component?.sell_price,
      expense_percent: component?.expense_percent,
      stock: component?.stock,
    };
  });

  return {
    product: {
      ...product,
      components,
      stock: enrichComboStock(components, 0),
    },
    error: null,
  };
}
