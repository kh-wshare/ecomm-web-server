import type { DashboardIconName } from "../icon";

import { DashboardIcon } from "../icon";

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
    accent: "bg-accent/10 text-accent",
    danger: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning-foreground",
  };

  return (
    <article className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${colors[accent]}`}
        >
          <DashboardIcon name={icon} />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">{helper}</p>
    </article>
  );
}
