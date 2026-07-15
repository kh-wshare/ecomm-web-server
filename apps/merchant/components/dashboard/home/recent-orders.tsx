import Link from "next/link";

import type { DashboardOrder } from "@/types/dashboard";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";

export function RecentOrders({ orders }: { orders: DashboardOrder[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-none dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h3 className="font-semibold">Recent orders</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Latest customer activity
          </p>
        </div>
        <Link
          className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          href="/orders"
        >
          View all
        </Link>
      </div>
      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-zinc-950/70 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  className="border-t border-slate-200 first:border-0 hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800/70"
                  key={order.id}
                >
                  <td className="px-5 py-3">
                    <Link
                      className="font-semibold hover:text-emerald-700 dark:hover:text-emerald-400"
                      href={`/orders/${order.id}`}
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                      {formatDate(
                        order.createdAt,
                        { dateStyle: "medium" },
                        "en-US",
                      )}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium">
                      {order.customerName || "Guest customer"}
                    </p>
                    <p className="mt-0.5 max-w-48 truncate text-xs text-slate-500 dark:text-zinc-400">
                      {order.customerEmail || "No email"}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium">No orders yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            New customer orders will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style =
    status === "COMPLETED" || status === "PAID"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : status === "CANCELLED" ||
          status === "PAYMENT_FAILED" ||
          status === "EXPIRED"
        ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        : status === "PROCESSING" || status === "FULFILLED"
          ? "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${style}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
