"use client";

import { MerchantRouteError } from "@/components/dashboard/route-feedback";

export default function PaymentsError({
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
      title="Payments are unavailable"
    />
  );
}
