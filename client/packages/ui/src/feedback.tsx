import type { ReactNode } from "react";

import { Alert, Button, Skeleton } from "@heroui/react";

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({
  className = "h-[440px]",
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Skeleton
      aria-label={label}
      className={`rounded-2xl ${className}`}
      role="status"
    />
  );
}

export function ErrorState({
  actionLabel = "Try again",
  description,
  onRetry,
  title = "Something went wrong",
}: {
  actionLabel?: string;
  description: ReactNode;
  onRetry?: () => void;
  title?: ReactNode;
}) {
  return (
    <div className="px-6 py-16">
      <Alert className="mx-auto max-w-xl" status="danger">
        <Alert.Content>
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{description}</Alert.Description>
          {onRetry && (
            <Button
              className="mt-4"
              size="sm"
              type="button"
              variant="danger"
              onPress={onRetry}
            >
              {actionLabel}
            </Button>
          )}
        </Alert.Content>
      </Alert>
    </div>
  );
}
