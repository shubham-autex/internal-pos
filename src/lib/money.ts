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

export function unitProfit(sellPrice: number, costPrice: number) {
  return roundMoney(sellPrice - costPrice);
}

export function marginPercent(sellPrice: number, costPrice: number) {
  if (sellPrice <= 0) return 0;
  return roundMoney(((sellPrice - costPrice) / sellPrice) * 100);
}
