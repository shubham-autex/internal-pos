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
        qty: z.number().int().positive(),
        stock: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1),
  discountAmount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(["upi", "cash"]),
  cashTendered: z.number().min(0).optional().nullable(),
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

  const { items, discountAmount, discountPercent, paymentMethod, cashTendered } =
    parsed.data;
  const totals = computeCartTotals(
    items.map((item) => ({
      ...item,
      expensePercent: item.expensePercent ?? 0,
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
    .select("id, name, stock, active")
    .in("id", productIds);

  if (stockError) {
    return { ok: false, error: stockError.message };
  }

  const stockById = new Map(
    (stockRows ?? []).map((row) => [
      row.id as string,
      {
        name: String(row.name),
        stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
        active: Boolean(row.active),
      },
    ]),
  );

  for (const item of items) {
    const product = stockById.get(item.productId);
    if (!product || !product.active) {
      return { ok: false, error: `${item.name} is no longer available` };
    }
    if (product.stock < item.qty) {
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
      unit_sell_price: line.sellPrice,
      unit_cost_price: line.costPrice,
      line_total: line.lineTotal,
      line_cost: line.lineCost,
      line_profit: line.lineProfit,
    })),
  );

  if (itemsError) {
    return { ok: false, error: itemsError.message };
  }

  for (const item of items) {
    const product = stockById.get(item.productId);
    if (!product) continue;
    const nextStock = product.stock - item.qty;
    if (nextStock < 0) {
      return { ok: false, error: `Not enough stock for ${product.name}` };
    }
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: nextStock })
      .eq("id", item.productId)
      .gte("stock", item.qty);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    stockById.set(item.productId, { ...product, stock: nextStock });
  }

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/products");
  return { ok: true, orderId: order.id };
}
