import type { SalesPoint } from "@/types/dashboard";
import { formatCurrency } from "@/lib/formatters/currency";

export function SalesChart({
  currency,
  sales,
}: {
  currency: string;
  sales: SalesPoint[];
}) {
  const maximum = Math.max(...sales.map(({ revenue }) => revenue), 1);
  const total = sales.reduce((sum, point) => sum + point.revenue, 0);

  return (
    <section className="rounded-lg border border-separator bg-surface p-5 shadow-none lg:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Sales performance</h3>
          <p className="mt-1 text-xs text-muted">
            Paid revenue over seven days
          </p>
        </div>
        <p className="text-sm font-semibold">
          {formatCurrency(total, currency)}
        </p>
      </div>
      <div
        aria-label="Seven day paid revenue chart"
        className="mt-6 flex h-56 items-end gap-2 sm:gap-3"
        role="img"
      >
        {sales.map((point) => {
          const height =
            point.revenue === 0
              ? 4
              : Math.max(12, Math.round((point.revenue / maximum) * 100));

          return (
            <div
              className="group flex h-full min-w-0 flex-1 flex-col justify-end"
              key={point.date}
            >
              <div className="relative flex flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-emerald-500/75 transition hover:bg-emerald-600"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${formatCurrency(
                    point.revenue,
                    currency,
                  )}`}
                />
              </div>
              <span className="mt-2 text-center text-[10px] text-muted sm:text-xs">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
