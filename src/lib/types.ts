export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  cost_price: number;
  sell_price: number;
  /** Operating expense as a percent of sell price (0–100). */
  expense_percent: number;
  stock: number;
  active: boolean;
  created_at: string;
};

export type CartItem = {
  productId: string;
  name: string;
  sku: string;
  sellPrice: number;
  costPrice: number;
  /** Snapshot of product expense % of sell price. */
  expensePercent: number;
  qty: number;
  /** Snapshot of available stock when the item was last synced from a product. */
  stock: number;
};

export type PaymentMethod = "upi" | "cash";

export type Order = {
  id: string;
  staff_id: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total: number;
  cost_total: number;
  profit: number;
  payment_method: PaymentMethod;
  cash_tendered: number | null;
  cash_change: number | null;
  status: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  quantity: number;
  unit_sell_price: number;
  unit_cost_price: number;
  line_total: number;
  line_cost: number;
  line_profit: number;
};
