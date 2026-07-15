"use client";

import { MerchantRouteError } from "@/components/dashboard/route-feedback";

export default function SocialPostsError({
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
      title="Social posts are unavailable"
    />
  );
}
