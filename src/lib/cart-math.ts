import type { CartItem } from "@/lib/types";
import {
  clampPercent,
  expenseAmount,
  netSellPrice,
  roundMoney,
  unitProfit,
} from "@/lib/money";

export type CartTotals = {
  /** Sum of list sell price × qty (before product discounts). */
  listSubtotal: number;
  /** Total ₹ off from per-product discount %. */
  productDiscountTotal: number;
  /** Sum after product discounts; base for cart-level % discount. */
  subtotal: number;
  discountFromPercent: number;
  /** Cart-level fixed + % discount only. */
  cartDiscountTotal: number;
  /** Product + cart discounts combined. */
  discountTotal: number;
  payable: number;
  costTotal: number;
  expenseTotal: number;
  profit: number;
  lines: Array<{
    productId: string;
    name: string;
    sku: string;
    qty: number;
    sellPrice: number;
    discountPercent: number;
    unitNetPrice: number;
    costPrice: number;
    expensePercent: number;
    lineListTotal: number;
    lineProductDiscount: number;
    lineTotal: number;
    lineCost: number;
    lineExpense: number;
    lineProfit: number;
  }>;
};

export function computeCartTotals(
  items: CartItem[],
  discountAmount = 0,
  discountPercent = 0,
): CartTotals {
  const lines = items.map((item) => {
    const expensePercent = clampPercent(item.expensePercent ?? 0);
    const discountPercent = clampPercent(item.discountPercent ?? 0);
    const unitNetPrice = netSellPrice(item.sellPrice, discountPercent);
    const lineListTotal = roundMoney(item.sellPrice * item.qty);
    const lineTotal = roundMoney(unitNetPrice * item.qty);
    const lineProductDiscount = roundMoney(lineListTotal - lineTotal);
    const lineCost = roundMoney(item.costPrice * item.qty);
    const lineExpense = roundMoney(
      expenseAmount(item.costPrice, expensePercent) * item.qty,
    );
    const lineProfit = roundMoney(
      unitProfit(
        item.sellPrice,
        item.costPrice,
        expensePercent,
        discountPercent,
      ) * item.qty,
    );
    return {
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      sellPrice: item.sellPrice,
      discountPercent,
      unitNetPrice,
      costPrice: item.costPrice,
      expensePercent,
      lineListTotal,
      lineProductDiscount,
      lineTotal,
      lineCost,
      lineExpense,
      lineProfit,
    };
  });

  const listSubtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineListTotal, 0),
  );
  const productDiscountTotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineProductDiscount, 0),
  );
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const costTotal = roundMoney(lines.reduce((sum, line) => sum + line.lineCost, 0));
  const expenseTotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineExpense, 0),
  );
  const safePercent = clampPercent(discountPercent);
  const discountFromPercent = roundMoney((subtotal * safePercent) / 100);
  const cartDiscountTotal = roundMoney(
    Math.min(subtotal, Math.max(0, discountAmount) + discountFromPercent),
  );
  const discountTotal = roundMoney(productDiscountTotal + cartDiscountTotal);
  const payable = roundMoney(Math.max(0, subtotal - cartDiscountTotal));
  const profit = roundMoney(payable - costTotal - expenseTotal);

  return {
    listSubtotal,
    productDiscountTotal,
    subtotal,
    discountFromPercent,
    cartDiscountTotal,
    discountTotal,
    payable,
    costTotal,
    expenseTotal,
    profit,
    lines,
  };
}
