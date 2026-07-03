import type { ProductStatus } from "@/types/product";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const styles = {
    ACTIVE: "bg-success/10 text-success",
    DRAFT: "bg-warning/10 text-warning-foreground",
    INACTIVE: "bg-surface-secondary text-muted",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}
