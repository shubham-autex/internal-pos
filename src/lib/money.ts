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

/** Product discount % is always floored (e.g. 67.6 → 67) for display and math. */
export function floorPercent(percent: number) {
  return Math.floor(clampPercent(percent));
}

/** ₹ for a percent of a base amount (cost for expense). */
export function expenseAmount(baseAmount: number, percent: number) {
  return roundMoney(((Number(baseAmount) || 0) * clampPercent(percent)) / 100);
}

/**
 * ₹ off list sell from product discount %:
 * floor the %, then ceil the rupee amount (e.g. ceil(price × 67 / 100)).
 */
export function productDiscountAmount(sellPrice: number, discountPercent = 0) {
  const sell = Number(sellPrice) || 0;
  const pct = floorPercent(discountPercent);
  if (sell <= 0 || pct <= 0) return 0;
  return Math.ceil((sell * pct) / 100);
}

/** Sell after product-level discount % (never below 0). */
export function netSellPrice(sellPrice: number, discountPercent = 0) {
  const sell = Number(sellPrice) || 0;
  return roundMoney(Math.max(0, sell - productDiscountAmount(sell, discountPercent)));
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
