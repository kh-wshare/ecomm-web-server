import Link from "next/link";

import type { DashboardInventoryStock } from "@/types/dashboard";

export function StockAlerts({ alerts }: { alerts: DashboardInventoryStock[] }) {
  const visibleAlerts = alerts.slice(0, 5);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-none dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h3 className="font-semibold">Stock alerts</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Items requiring attention
          </p>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {alerts.length}
          </span>
        )}
      </div>
      {visibleAlerts.length ? (
        <div className="divide-y divide-slate-200 dark:divide-zinc-800">
          {visibleAlerts.map((stock) => (
            <Link
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-zinc-800/70"
              href={`/inventory?productId=${stock.productId}`}
              key={stock.id}
            >
              <span
                className={`size-2 shrink-0 rounded-full ${
                  stock.availableStock <= 0 ? "bg-red-500" : "bg-amber-500"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {stock.product.name}
                  {stock.variant ? ` - ${stock.variant.name}` : ""}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-zinc-400">
                  {stock.variant?.sku ?? stock.product.sku}
                </span>
              </span>
              <span
                className={`text-xs font-bold ${
                  stock.availableStock <= 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}
              >
                {stock.availableStock <= 0
                  ? "Out"
                  : `${stock.availableStock} left`}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span aria-hidden="true">✓</span>
          </div>
          <p className="mt-3 text-sm font-medium">Stock levels look healthy</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Low and out-of-stock items will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
