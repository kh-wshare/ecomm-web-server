import type { ReactNode } from "react";

import { Chip } from "@heroui/react";

export type StatusTone = "danger" | "info" | "muted" | "success" | "warning";

export function StatusBadge({
  children,
  status,
  tone,
}: {
  children?: ReactNode;
  status: string;
  tone?: StatusTone;
}) {
  const resolvedTone = tone ?? statusTone(status);
  const colors: Record<
    StatusTone,
    "accent" | "danger" | "default" | "success" | "warning"
  > = {
    danger: "danger",
    info: "accent",
    muted: "default",
    success: "success",
    warning: "warning",
  };

  return (
    <Chip
      className="text-[10px] font-bold tracking-wide"
      color={colors[resolvedTone]}
      size="sm"
      variant="soft"
    >
      {children ?? status.replaceAll("_", " ")}
    </Chip>
  );
}

export function MoneyText({
  amount,
  className,
  currency,
}: {
  amount: number | string;
  className?: string;
  currency: string;
}) {
  return (
    <span className={className}>
      {new Intl.NumberFormat(undefined, {
        currency,
        style: "currency",
      }).format(Number(amount))}
    </span>
  );
}

export function DateTimeText({
  className,
  options,
  value,
}: {
  className?: string;
  options?: Intl.DateTimeFormatOptions;
  value: Date | number | string | null | undefined;
}) {
  const date = value ? new Date(value) : null;
  const validDate = date && !Number.isNaN(date.getTime()) ? date : null;

  return (
    <time className={className} dateTime={validDate?.toISOString()}>
      {validDate ? new Intl.DateTimeFormat(undefined, options).format(validDate) : "-"}
    </time>
  );
}

function statusTone(status: string): StatusTone {
  const normalized = status.toUpperCase();

  if (
    [
      "ACTIVE",
      "COMPLETED",
      "CONFIRMED",
      "FULFILLED",
      "PAID",
      "PUBLISHED",
    ].includes(normalized)
  ) {
    return "success";
  }

  if (
    ["FAILED", "CANCELLED", "EXPIRED", "INACTIVE", "OUT_OF_STOCK"].includes(
      normalized,
    )
  ) {
    return "danger";
  }

  if (
    [
      "PENDING",
      "PENDING_PAYMENT",
      "DRAFT",
      "LOW_STOCK",
      "PARTIALLY_PUBLISHED",
    ].includes(normalized)
  ) {
    return "warning";
  }

  return "muted";
}
