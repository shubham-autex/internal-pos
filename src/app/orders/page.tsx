import { AppShell } from "@/components/app-shell";
import { formatINR } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = (data ?? []) as Order[];

  return (
    <AppShell email={user?.email}>
      <div className="space-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
            Orders
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Recent paid sales from this stall.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">
            {error.message}
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Pay</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    {new Date(order.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    {order.payment_method === "cash" ? (
                      <span className="font-medium uppercase">Cash</span>
                    ) : (
                      <div>
                        <p className="font-medium uppercase">UPI</p>
                        {order.upi_id ? (
                          <p className="mt-0.5 break-all text-xs text-[var(--ink-muted)]">
                            {order.upi_name ? `${order.upi_name} · ` : ""}
                            {order.upi_id}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatINR(Number(order.total))}
                  </td>
                  <td className="px-4 py-3">{formatINR(Number(order.profit))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--ink-muted)]">
              No orders yet.
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
