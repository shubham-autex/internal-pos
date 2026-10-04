import type { SupabaseClient } from "@supabase/supabase-js";
import { roundMoney } from "@/lib/money";
import { asTagList } from "@/lib/tags";

export type DashboardRange = "today" | "7d" | "30d" | "all";

export type ProductSalesStat = {
  productId: string | null;
  name: string;
  sku: string;
  tags: string[];
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type TagSalesStat = {
  tag: string;
  productCount: number;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type DashboardSummary = {
  orderCount: number;
  revenue: number;
  cost: number;
  profit: number;
  avgTicket: number;
  upiRevenue: number;
  cashRevenue: number;
};

export type DashboardData = {
  range: DashboardRange;
  summary: DashboardSummary;
  topProducts: ProductSalesStat[];
  lowProducts: ProductSalesStat[];
  neverSold: ProductSalesStat[];
  byTag: TagSalesStat[];
  error: string | null;
};

const RANGE_LABELS: Record<DashboardRange, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  all: "All time",
};

export function parseDashboardRange(value: string | null | undefined): DashboardRange {
  if (value === "today" || value === "7d" || value === "30d" || value === "all") {
    return value;
  }
  return "7d";
}

export function dashboardRangeLabel(range: DashboardRange) {
  return RANGE_LABELS[range];
}

export function rangeStartIso(range: DashboardRange): string | null {
  if (range === "all") return null;

  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function emptySummary(): DashboardSummary {
  return {
    orderCount: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    avgTicket: 0,
    upiRevenue: 0,
    cashRevenue: 0,
  };
}

export async function loadDashboardData(
  supabase: SupabaseClient,
  range: DashboardRange,
): Promise<DashboardData> {
  const since = rangeStartIso(range);

  let ordersQuery = supabase
    .from("orders")
    .select("id, total, cost_total, profit, payment_method, created_at")
    .order("created_at", { ascending: false });

  if (since) {
    ordersQuery = ordersQuery.gte("created_at", since);
  }

  const { data: orders, error: ordersError } = await ordersQuery;
  if (ordersError) {
    return {
      range,
      summary: emptySummary(),
      topProducts: [],
      lowProducts: [],
      neverSold: [],
      byTag: [],
      error: ordersError.message,
    };
  }

  const orderRows = orders ?? [];
  const summary = emptySummary();
  summary.orderCount = orderRows.length;

  for (const order of orderRows) {
    const total = Number(order.total) || 0;
    const cost = Number(order.cost_total) || 0;
    const profit = Number(order.profit) || 0;
    summary.revenue = roundMoney(summary.revenue + total);
    summary.cost = roundMoney(summary.cost + cost);
    summary.profit = roundMoney(summary.profit + profit);
    if (order.payment_method === "cash") {
      summary.cashRevenue = roundMoney(summary.cashRevenue + total);
    } else {
      summary.upiRevenue = roundMoney(summary.upiRevenue + total);
    }
  }
  summary.avgTicket =
    summary.orderCount > 0
      ? roundMoney(summary.revenue / summary.orderCount)
      : 0;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, sku, tags, active")
    .eq("active", true);

  if (productsError) {
    return {
      range,
      summary,
      topProducts: [],
      lowProducts: [],
      neverSold: [],
      byTag: [],
      error: productsError.message,
    };
  }

  const productMeta = new Map(
    (products ?? []).map((row) => [
      String(row.id),
      {
        name: String(row.name),
        sku: String(row.sku),
        tags: asTagList(row.tags),
      },
    ]),
  );

  const productStats = new Map<string, ProductSalesStat>();

  function ensureProductStat(
    key: string,
    seed: Pick<ProductSalesStat, "productId" | "name" | "sku" | "tags">,
  ) {
    const existing = productStats.get(key);
    if (existing) return existing;
    const created: ProductSalesStat = {
      ...seed,
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };
    productStats.set(key, created);
    return created;
  }

  for (const [id, meta] of productMeta) {
    ensureProductStat(id, {
      productId: id,
      name: meta.name,
      sku: meta.sku,
      tags: meta.tags,
    });
  }

  const orderIds = orderRows.map((order) => String(order.id));
  if (orderIds.length > 0) {
    // Chunk to stay under PostgREST `.in()` URL limits on large histories.
    const chunkSize = 200;
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize);
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select(
          "product_id, product_name, sku, quantity, line_total, line_cost, line_profit",
        )
        .in("order_id", chunk);

      if (itemsError) {
        return {
          range,
          summary,
          topProducts: [],
          lowProducts: [],
          neverSold: [],
          byTag: [],
          error: itemsError.message,
        };
      }

      for (const item of items ?? []) {
        const productId = item.product_id ? String(item.product_id) : null;
        const key = productId ?? `orphan:${item.sku}:${item.product_name}`;
        const meta = productId ? productMeta.get(productId) : undefined;
        const stat = ensureProductStat(key, {
          productId,
          name: meta?.name ?? String(item.product_name),
          sku: meta?.sku ?? String(item.sku),
          tags: meta?.tags ?? [],
        });
        stat.quantity += Math.max(0, Math.floor(Number(item.quantity) || 0));
        stat.revenue = roundMoney(stat.revenue + (Number(item.line_total) || 0));
        stat.cost = roundMoney(stat.cost + (Number(item.line_cost) || 0));
        stat.profit = roundMoney(stat.profit + (Number(item.line_profit) || 0));
      }
    }
  }

  const allStats = [...productStats.values()];
  const sold = allStats.filter((stat) => stat.quantity > 0);
  const neverSold = allStats
    .filter((stat) => stat.quantity === 0 && stat.productId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  const byQuantityDesc = (a: ProductSalesStat, b: ProductSalesStat) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return a.name.localeCompare(b.name);
  };

  const topProducts = [...sold].sort(byQuantityDesc).slice(0, 8);
  const lowProducts = [...sold].sort((a, b) => -byQuantityDesc(a, b)).slice(0, 8);

  const tagMap = new Map<string, TagSalesStat & { productIds: Set<string> }>();
  for (const stat of allStats) {
    if (stat.tags.length === 0) continue;
    for (const tag of stat.tags) {
      let bucket = tagMap.get(tag);
      if (!bucket) {
        bucket = {
          tag,
          productCount: 0,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          productIds: new Set(),
        };
        tagMap.set(tag, bucket);
      }
      if (stat.productId) bucket.productIds.add(stat.productId);
      bucket.quantity += stat.quantity;
      bucket.revenue = roundMoney(bucket.revenue + stat.revenue);
      bucket.cost = roundMoney(bucket.cost + stat.cost);
      bucket.profit = roundMoney(bucket.profit + stat.profit);
    }
  }

  const byTag = [...tagMap.values()]
    .map(({ productIds, ...rest }) => ({
      ...rest,
      productCount: productIds.size,
    }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return a.tag.localeCompare(b.tag);
    });

  return {
    range,
    summary,
    topProducts,
    lowProducts,
    neverSold,
    byTag,
    error: null,
  };
}
