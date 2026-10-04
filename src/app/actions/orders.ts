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
        qty: z.number().int().positive(),
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
  const totals = computeCartTotals(items, discountAmount, discountPercent);

  if (totals.payable <= 0) {
    return { ok: false, error: "Payable amount must be greater than zero" };
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

  // Best-effort stock decrement
  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.productId)
      .maybeSingle();

    if (product) {
      await supabase
        .from("products")
        .update({ stock: Math.max(0, Number(product.stock) - item.qty) })
        .eq("id", item.productId);
    }
  }

  revalidatePath("/");
  revalidatePath("/orders");
  return { ok: true, orderId: order.id };
}
