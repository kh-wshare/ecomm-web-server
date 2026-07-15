"use client";

import { Button, ErrorState, LoadingState } from "@repo/ui";

export function MerchantRouteLoading({ label }: { label: string }) {
  return <LoadingState className="h-[620px]" label={label} />;
}

export function MerchantRouteError({
  error,
  reset,
  title,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
}) {
  return (
    <ErrorState
      actionLabel="Try again"
      description={error.message || "Refresh the route and try again."}
      title={title}
      onRetry={reset}
    />
  );
}

export function MerchantRouteNotice({
  actionLabel,
  message,
  onAction,
  title,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4 text-center">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted">{message}</p>
        {onAction && actionLabel ? (
          <Button
            className="mt-5"
            type="button"
            variant="primary"
            onPress={onAction}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
