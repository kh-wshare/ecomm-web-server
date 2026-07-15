"use client";

import { MerchantRouteError } from "@/components/dashboard/route-feedback";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MerchantRouteError
      error={error}
      reset={reset}
      title="Orders are unavailable"
    />
  );
}
