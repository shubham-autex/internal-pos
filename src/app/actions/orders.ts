"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeCartTotals } from "@/lib/cart-math";
import { roundMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        name: z.string(),
        sku: z.string(),
        sellPrice: z.number(),
        costPrice: z.number(),
        expensePercent: z.number().min(0).max(100).optional().default(0),
        discountPercent: z.number().min(0).max(100).optional().default(0),
        surgePrice: z.number().min(0).optional().default(0),
        qty: z.number().int().positive(),
        stock: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1),
  discountAmount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["upi", "cash"]),
  cashTendered: z.number().min(0).optional().nullable(),
  /** UPI VPA / payee name shown on the QR when marking paid. */
  upiId: z.string().trim().min(1).optional().nullable(),
  upiName: z.string().trim().optional().nullable(),
  customerMobile: z
    .string()
    .trim()
    .nullish()
    .transform((value) => {
      const digits = (value ?? "").replace(/\D/g, "");
      if (!digits) return null;
      if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
      if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
      return digits;
    })
    .refine((value) => value === null || /^[6-9]\d{9}$/.test(value), {
      message: "Enter a 10-digit mobile number",
    }),
});

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function createOrder(
  input: z.infer<typeof orderSchema>,
): Promise<CreateOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in" };
  }

  const {
    items,
    discountAmount,
    discountPercent,
    paymentMethod,
    cashTendered,
    upiId,
    upiName,
    customerMobile,
  } = parsed.data;
  const totals = computeCartTotals(
    items.map((item) => ({
      ...item,
      expensePercent: item.expensePercent ?? 0,
      discountPercent: item.discountPercent ?? 0,
      surgePrice: item.surgePrice ?? 0,
      stock: item.stock ?? 0,
    })),
    discountAmount,
    discountPercent,
  );

  if (totals.payable <= 0) {
    return { ok: false, error: "Payable amount must be greater than zero" };
  }

  const productIds = [...new Set(items.map((item) => item.productId))];
  const { data: stockRows, error: stockError } = await supabase
    .from("products")
    .select("id, name, stock, active, kind")
    .in("id", productIds);

  if (stockError) {
    return { ok: false, error: stockError.message };
  }

  const productById = new Map(
    (stockRows ?? []).map((row) => [
      row.id as string,
      {
        name: String(row.name),
        stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
        active: Boolean(row.active),
        kind: String(row.kind || "simple"),
      },
    ]),
  );

  const comboIds = items
    .map((item) => item.productId)
    .filter((id) => productById.get(id)?.kind === "combo");

  const bomByCombo = new Map<
    string,
    Array<{ component_id: string; quantity: number; name: string }>
  >();

  if (comboIds.length > 0) {
    const { data: bomRows, error: bomError } = await supabase
      .from("product_components")
      .select("combo_id, component_id, quantity")
      .in("combo_id", [...new Set(comboIds)]);

    if (bomError) {
      return { ok: false, error: bomError.message };
    }

    const componentIds = [
      ...new Set((bomRows ?? []).map((row) => String(row.component_id))),
    ];

    const { data: componentRows, error: componentError } = await supabase
      .from("products")
      .select("id, name, stock, active")
      .in("id", componentIds);

    if (componentError) {
      return { ok: false, error: componentError.message };
    }

    const componentById = new Map(
      (componentRows ?? []).map((row) => [
        String(row.id),
        {
          name: String(row.name),
          stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
          active: Boolean(row.active),
        },
      ]),
    );

    for (const row of bomRows ?? []) {
      const comboId = String(row.combo_id);
      const componentId = String(row.component_id);
      const component = componentById.get(componentId);
      if (!component || !component.active) {
        return {
          ok: false,
          error: `A combo item is missing or inactive for ${productById.get(comboId)?.name ?? "combo"}`,
        };
      }
      const list = bomByCombo.get(comboId) ?? [];
      list.push({
        component_id: componentId,
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        name: component.name,
      });
      bomByCombo.set(comboId, list);
      // Track live stock for components in the same map used for deduction.
      if (!productById.has(componentId)) {
        productById.set(componentId, {
          name: component.name,
          stock: component.stock,
          active: component.active,
          kind: "simple",
        });
      }
    }
  }

  // Aggregate stock deductions (simple lines + combo components).
  const deductById = new Map<string, { name: string; qty: number }>();

  function addDeduct(productId: string, name: string, qty: number) {
    const existing = deductById.get(productId);
    if (existing) {
      existing.qty += qty;
      return;
    }
    deductById.set(productId, { name, qty });
  }

  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product || !product.active) {
      return { ok: false, error: `${item.name} is no longer available` };
    }

    if (product.kind === "combo") {
      const bom = bomByCombo.get(item.productId) ?? [];
      if (bom.length === 0) {
        return { ok: false, error: `${item.name} has no combo items configured` };
      }
      for (const component of bom) {
        addDeduct(
          component.component_id,
          component.name,
          component.quantity * item.qty,
        );
      }
    } else {
      addDeduct(item.productId, product.name, item.qty);
    }
  }

  for (const [productId, need] of deductById) {
    const product = productById.get(productId);
    if (!product || !product.active) {
      return { ok: false, error: `${need.name} is no longer available` };
    }
    if (product.stock < need.qty) {
      return {
        ok: false,
        error:
          product.stock <= 0
            ? `${product.name} is out of stock`
            : `Only ${product.stock} left of ${product.name}`,
      };
    }
  }

  let cashChange: number | null = null;
  if (paymentMethod === "cash") {
    const tendered = cashTendered ?? 0;
    if (tendered < totals.payable) {
      return { ok: false, error: "Cash tendered is less than total" };
    }
    cashChange = roundMoney(tendered - totals.payable);
  }

  if (paymentMethod === "upi" && !upiId) {
    return { ok: false, error: "Select a UPI account before marking paid" };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      staff_id: user.id,
      subtotal: totals.subtotal,
      discount_amount: discountAmount,
      discount_percent: discountPercent,
      total: totals.payable,
      cost_total: totals.costTotal,
      profit: totals.profit,
      payment_method: paymentMethod,
      cash_tendered: paymentMethod === "cash" ? cashTendered ?? null : null,
      cash_change: cashChange,
      upi_id: paymentMethod === "upi" ? upiId ?? null : null,
      upi_name:
        paymentMethod === "upi" ? (upiName?.trim() || upiId || null) : null,
      customer_mobile: customerMobile,
      status: "paid",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { ok: false, error: orderError?.message ?? "Failed to create order" };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    totals.lines.map((line) => ({
      order_id: order.id,
      product_id: line.productId,
      product_name: line.name,
      sku: line.sku,
      quantity: line.qty,
      unit_sell_price: line.unitChargedPrice,
      unit_cost_price: line.costPrice,
      line_total: line.lineTotal,
      line_cost: line.lineCost,
      line_profit: line.lineProfit,
    })),
  );

  if (itemsError) {
    return { ok: false, error: itemsError.message };
  }

  for (const [productId, need] of deductById) {
    const product = productById.get(productId);
    if (!product) continue;
    const nextStock = product.stock - need.qty;
    if (nextStock < 0) {
      return { ok: false, error: `Not enough stock for ${product.name}` };
    }
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: nextStock })
      .eq("id", productId)
      .gte("stock", need.qty);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    productById.set(productId, { ...product, stock: nextStock });
  }

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true, orderId: order.id };
}

export type CancelOrderResult = { ok: true } | { ok: false; error: string };

export async function cancelOrder(orderId: string): Promise<CancelOrderResult> {
  if (!z.string().uuid().safeParse(orderId).success) {
    return { ok: false, error: "Invalid order" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in" };
  }

  // Claim the order first so a double click can't restock twice.
  const { data: claimed, error: claimError } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id");

  if (claimError) {
    return { ok: false, error: claimError.message };
  }
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: "Order not found or already cancelled" };
  }

  const revert = () =>
    supabase.from("orders").update({ status: "paid" }).eq("id", orderId);

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  if (itemsError) {
    await revert();
    return { ok: false, error: itemsError.message };
  }

  const lineIds = [
    ...new Set(
      (items ?? [])
        .map((row) => row.product_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const restock = new Map<string, number>();
  const add = (id: string, qty: number) =>
    restock.set(id, (restock.get(id) ?? 0) + qty);

  if (lineIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, kind")
      .in("id", lineIds);
    if (productsError) {
      await revert();
      return { ok: false, error: productsError.message };
    }
    const comboIds = new Set(
      (products ?? [])
        .filter((p) => p.kind === "combo")
        .map((p) => String(p.id)),
    );

    const bom = new Map<string, Array<{ id: string; qty: number }>>();
    if (comboIds.size > 0) {
      const { data: bomRows, error: bomError } = await supabase
        .from("product_components")
        .select("combo_id, component_id, quantity")
        .in("combo_id", [...comboIds]);
      if (bomError) {
        await revert();
        return { ok: false, error: bomError.message };
      }
      for (const row of bomRows ?? []) {
        const key = String(row.combo_id);
        const list = bom.get(key) ?? [];
        list.push({
          id: String(row.component_id),
          qty: Math.max(1, Math.floor(Number(row.quantity) || 1)),
        });
        bom.set(key, list);
      }
    }

    for (const row of items ?? []) {
      if (!row.product_id) continue;
      const pid = String(row.product_id);
      const qty = Number(row.quantity) || 0;
      if (comboIds.has(pid)) {
        for (const c of bom.get(pid) ?? []) add(c.id, c.qty * qty);
      } else {
        add(pid, qty);
      }
    }
  }

  for (const [productId, qty] of restock) {
    const { data: row, error: readError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", productId)
      .single();
    if (readError || !row) continue;
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: Math.max(0, Math.floor(Number(row.stock) || 0)) + qty })
      .eq("id", productId);
    if (updateError) {
      return {
        ok: false,
        error: `Order cancelled but stock restore failed: ${updateError.message}`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  return { ok: true };
}
