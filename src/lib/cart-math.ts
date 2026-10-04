import type { CartItem } from "@/lib/types";
import { roundMoney } from "@/lib/money";

export type CartTotals = {
  subtotal: number;
  discountFromPercent: number;
  discountTotal: number;
  payable: number;
  costTotal: number;
  profit: number;
  lines: Array<{
    productId: string;
    name: string;
    sku: string;
    qty: number;
    sellPrice: number;
    costPrice: number;
    lineTotal: number;
    lineCost: number;
    lineProfit: number;
  }>;
};

export function computeCartTotals(
  items: CartItem[],
  discountAmount = 0,
  discountPercent = 0,
): CartTotals {
  const lines = items.map((item) => {
    const lineTotal = roundMoney(item.sellPrice * item.qty);
    const lineCost = roundMoney(item.costPrice * item.qty);
    return {
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      sellPrice: item.sellPrice,
      costPrice: item.costPrice,
      lineTotal,
      lineCost,
      lineProfit: roundMoney(lineTotal - lineCost),
    };
  });

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const costTotal = roundMoney(lines.reduce((sum, line) => sum + line.lineCost, 0));
  const safePercent = Math.min(Math.max(discountPercent, 0), 100);
  const discountFromPercent = roundMoney((subtotal * safePercent) / 100);
  const discountTotal = roundMoney(
    Math.min(subtotal, Math.max(0, discountAmount) + discountFromPercent),
  );
  const payable = roundMoney(Math.max(0, subtotal - discountTotal));
  const profit = roundMoney(payable - costTotal);

  return {
    subtotal,
    discountFromPercent,
    discountTotal,
    payable,
    costTotal,
    profit,
    lines,
  };
}
