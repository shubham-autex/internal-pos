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

export function unitProfit(
  sellPrice: number,
  costPrice: number,
  expensePercent = 0,
) {
  return roundMoney(
    sellPrice - costPrice - expenseAmount(sellPrice, expensePercent),
  );
}

export function marginPercent(
  sellPrice: number,
  costPrice: number,
  expensePercent = 0,
) {
  if (sellPrice <= 0) return 0;
  return roundMoney(
    (unitProfit(sellPrice, costPrice, expensePercent) / sellPrice) * 100,
  );
}
