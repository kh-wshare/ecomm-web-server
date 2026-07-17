export function OrderStatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAID" ||
    status === "FULFILLED" ||
    status === "COMPLETED" ||
    status === "CONFIRMED"
      ? "bg-success/10 text-success"
      : status === "CANCELLED" ||
          status === "FAILED" ||
          status === "PAYMENT_FAILED" ||
          status === "REFUNDED"
        ? "bg-danger/10 text-danger"
        : status === "PROCESSING" || status === "PENDING"
          ? "bg-warning/10 text-warning-foreground"
          : "bg-surface-secondary text-muted";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${tone}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
