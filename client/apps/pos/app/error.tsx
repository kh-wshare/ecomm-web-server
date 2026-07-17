"use client";

import { Button } from "@repo/ui";

export default function PosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-danger/30 bg-surface p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
          POS unavailable
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Register could not load</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {error.message || "Refresh the register or sign in again."}
        </p>
        <Button className="mt-5 bg-primary text-white" type="button" onPress={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
