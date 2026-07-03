import Link from "next/link";

import type { DashboardInventoryStock } from "@/types/dashboard";

export function StockAlerts({ alerts }: { alerts: DashboardInventoryStock[] }) {
  const visibleAlerts = alerts.slice(0, 5);

  return (
    <section className="rounded-2xl border border-separator bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-separator px-5 py-4">
        <div>
          <h3 className="font-semibold">Stock alerts</h3>
          <p className="mt-1 text-xs text-muted">Items requiring attention</p>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-bold text-danger">
            {alerts.length}
          </span>
        )}
      </div>
      {visibleAlerts.length ? (
        <div className="divide-y divide-separator">
          {visibleAlerts.map((stock) => (
            <Link
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface-secondary"
              href={`/dashboard/inventory?productId=${stock.productId}`}
              key={stock.id}
            >
              <span
                className={`size-2 shrink-0 rounded-full ${
                  stock.availableStock <= 0 ? "bg-danger" : "bg-warning"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {stock.product.name}
                  {stock.variant ? ` — ${stock.variant.name}` : ""}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {stock.variant?.sku ?? stock.product.sku}
                </span>
              </span>
              <span
                className={`text-xs font-bold ${
                  stock.availableStock <= 0 ? "text-danger" : "text-warning"
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
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-success/10 text-success">
            ✓
          </div>
          <p className="mt-3 text-sm font-medium">Stock levels look healthy</p>
          <p className="mt-1 text-xs text-muted">
            Low and out-of-stock items will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
