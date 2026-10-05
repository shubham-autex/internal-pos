import {
  clampPercent,
  expenseAmount,
  roundMoney,
} from "@/lib/money";
import type { ProductComponentRef } from "@/lib/types";

export type ComboCostingInput = {
  cost_price: number;
  sell_price: number;
  expense_percent: number;
  quantity: number;
};

/** Cost and expense from components. Expense % is of cost, not sell. */
export function deriveComboCosting(components: ComboCostingInput[]) {
  let cost = 0;
  let expenseRupees = 0;

  for (const component of components) {
    const qty = Math.max(0, Math.floor(Number(component.quantity) || 0));
    const unitCost = Number(component.cost_price) || 0;
    cost += unitCost * qty;
    expenseRupees +=
      expenseAmount(unitCost, Number(component.expense_percent) || 0) * qty;
  }

  cost = roundMoney(cost);
  expenseRupees = roundMoney(expenseRupees);
  const expense_percent =
    cost > 0 ? clampPercent(roundMoney((expenseRupees / cost) * 100)) : 0;

  return {
    cost_price: cost,
    expense_percent,
    expense_rupees: expenseRupees,
  };
}

export function comboAvailableStock(
  components: Array<{ stock: number; quantity: number }>,
) {
  if (components.length === 0) return 0;
  let available = Number.POSITIVE_INFINITY;
  for (const component of components) {
    const qty = Math.max(1, Math.floor(Number(component.quantity) || 0));
    const stock = Math.max(0, Math.floor(Number(component.stock) || 0));
    available = Math.min(available, Math.floor(stock / qty));
  }
  return Number.isFinite(available) ? available : 0;
}

export function enrichComboStock(
  components: ProductComponentRef[] | undefined,
  fallbackStock: number,
) {
  if (!components || components.length === 0) {
    return Math.max(0, Math.floor(Number(fallbackStock) || 0));
  }
  return comboAvailableStock(
    components.map((component) => ({
      stock: Number(component.stock) || 0,
      quantity: component.quantity,
    })),
  );
}
