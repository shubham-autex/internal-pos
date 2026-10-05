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

export function expenseAmount(sellPrice: number, expensePercent: number) {
  return roundMoney((sellPrice * clampPercent(expensePercent)) / 100);
}

/** Sell after product-level discount % (never below 0). */
export function netSellPrice(sellPrice: number, discountPercent = 0) {
  const sell = Number(sellPrice) || 0;
  return roundMoney(
    Math.max(0, sell - expenseAmount(sell, discountPercent)),
  );
}

export function unitProfit(
  sellPrice: number,
  costPrice: number,
  expensePercent = 0,
  discountPercent = 0,
) {
  const net = netSellPrice(sellPrice, discountPercent);
  return roundMoney(net - costPrice - expenseAmount(net, expensePercent));
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
