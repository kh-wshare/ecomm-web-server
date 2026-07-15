"use client";

import { ErrorState } from "@repo/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorState
      description={error.message}
      title="Merchant dashboard could not load"
      onRetry={reset}
    />
  );
}
