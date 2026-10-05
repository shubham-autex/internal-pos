const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatINR(amount: number) {
  return inr.format(Number.isFinite(amount) ? amount : 0);
}

export function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function clampPercent(percent: number) {
  return Math.min(Math.max(Number(percent) || 0, 0), 100);
}

/** ₹ for a percent of a base amount (cost for expense, sell for discount). */
export function expenseAmount(baseAmount: number, percent: number) {
  return roundMoney(((Number(baseAmount) || 0) * clampPercent(percent)) / 100);
}

/** Sell after product-level discount % (never below 0). */
export function netSellPrice(sellPrice: number, discountPercent = 0) {
  const sell = Number(sellPrice) || 0;
  return roundMoney(Math.max(0, sell - expenseAmount(sell, discountPercent)));
}

export function unitProfit(
  sellPrice: number,
  costPrice: number,
  expensePercent = 0,
  discountPercent = 0,
) {
  const net = netSellPrice(sellPrice, discountPercent);
  const cost = Number(costPrice) || 0;
  return roundMoney(net - cost - expenseAmount(cost, expensePercent));
}

export function marginPercent(
  sellPrice: number,
  costPrice: number,
  expensePercent = 0,
  discountPercent = 0,
) {
  const net = netSellPrice(sellPrice, discountPercent);
  if (net <= 0) return 0;
  return roundMoney(
    (unitProfit(sellPrice, costPrice, expensePercent, discountPercent) / net) *
      100,
  );
}
