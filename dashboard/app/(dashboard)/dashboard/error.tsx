"use client";

import { ApiError } from "@/lib/errors/api-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const correlationId =
    error instanceof ApiError ? error.correlationId : undefined;

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger/10 text-xl font-bold text-danger">
          !
        </div>
        <h2 className="mt-4 text-xl font-semibold">
          We could not load this page
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{error.message}</p>
        {correlationId && (
          <p className="mt-2 text-xs text-muted">
            Reference: <code>{correlationId}</code>
          </p>
        )}
        <button
          className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          type="button"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
