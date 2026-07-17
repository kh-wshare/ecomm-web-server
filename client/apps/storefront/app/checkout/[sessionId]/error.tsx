"use client";

import { Button } from "@heroui/react";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-xl rounded-3xl border border-danger/30 bg-surface p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
          Checkout unavailable
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Checkout could not load</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {error.message || "Return to the product and start checkout again."}
        </p>
        <Button className="mt-6" type="button" variant="primary" onPress={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
