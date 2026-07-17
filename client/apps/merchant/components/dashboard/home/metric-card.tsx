import type { DashboardIconName } from "@/components/dashboard/dashboard-icon";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";

export function MetricCard({
  accent,
  helper,
  icon,
  label,
  value,
}: {
  accent: "accent" | "danger" | "success" | "warning";
  helper: string;
  icon: DashboardIconName;
  label: string;
  value: string;
}) {
  const colors = {
    accent: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    danger: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  };

  return (
    <article className="rounded-lg border border-separator bg-surface p-5 shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg ${colors[accent]}`}
        >
          <DashboardIcon name={icon} />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">
        {helper}
      </p>
    </article>
  );
}
