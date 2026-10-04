import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  dashboardRangeLabel,
  loadDashboardData,
  parseDashboardRange,
  type DashboardRange,
  type ProductSalesStat,
  type TagSalesStat,
} from "@/lib/dashboard";
import { formatINR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const RANGES: DashboardRange[] = ["today", "7d", "30d", "all"];

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function ProductRankTable({
  title,
  subtitle,
  rows,
  empty,
}: {
  title: string;
  subtitle: string;
  rows: ProductSalesStat[];
  empty: string;
}) {
  return (
    <section className="@container rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          {title}
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
          {empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.productId ?? row.sku}-${row.name}`}
                  className="border-t border-[var(--line)]"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-[var(--ink-muted)]">{row.sku}</p>
                    {row.tags.length > 0 ? (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {row.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.quantity}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatINR(row.revenue)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatINR(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TagTable({ rows }: { rows: TagSalesStat[] }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          By tag
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Products that share a tag are summed here.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
          No tagged products yet. Add tags on the product edit screen.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Tag</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Sales</th>
                <th className="px-4 py-3 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tag} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent-ink)]">
                      {row.tag}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.productCount}</td>
                  <td className="px-4 py-3 tabular-nums">{row.quantity}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {formatINR(row.revenue)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatINR(row.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = parseDashboardRange(params.range);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await loadDashboardData(supabase, range);
  const { summary } = data;

  return (
    <AppShell email={user?.email}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
              Dashboard
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Sales, profit, and product performance ·{" "}
              {dashboardRangeLabel(range)}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((value) => {
              const active = value === range;
              return (
                <Link
                  key={value}
                  href={`/dashboard?range=${value}`}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                    active
                      ? "bg-[var(--ink)] text-[var(--surface)]"
                      : "bg-[var(--surface)] text-[var(--ink)] ring-1 ring-[var(--line)]"
                  }`}
                >
                  {dashboardRangeLabel(value)}
                </Link>
              );
            })}
          </div>
        </div>

        {data.error ? (
          <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">
            {data.error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Sales"
            value={formatINR(summary.revenue)}
            hint={`${summary.orderCount} order${summary.orderCount === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Profit"
            value={formatINR(summary.profit)}
            hint={`Cost ${formatINR(summary.cost)}`}
          />
          <StatCard
            label="Avg ticket"
            value={formatINR(summary.avgTicket)}
            hint="Per paid order"
          />
          <StatCard
            label="Pay mix"
            value={`${formatINR(summary.upiRevenue)}`}
            hint={`UPI · Cash ${formatINR(summary.cashRevenue)}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ProductRankTable
            title="Highest selling"
            subtitle="Most units sold in this period"
            rows={data.topProducts}
            empty="No sales in this period yet."
          />
          <ProductRankTable
            title="Lowest selling"
            subtitle="Fewest units among products that sold"
            rows={data.lowProducts}
            empty="No sales in this period yet."
          />
        </div>

        <ProductRankTable
          title="Not sold"
          subtitle="Active products with zero sales in this period"
          rows={data.neverSold}
          empty="Every active product sold at least once — or there are no products."
        />

        <TagTable rows={data.byTag} />
      </div>
    </AppShell>
  );
}
