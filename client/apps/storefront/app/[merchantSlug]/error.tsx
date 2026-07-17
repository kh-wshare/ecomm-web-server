"use client";

import Link from "next/link";

import { Button } from "@repo/ui";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-center text-foreground">
      <div className="max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
          Store unavailable
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          We could not open this storefront
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {error.message ||
            "The store may be offline, or the catalog could not be loaded."}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            type="button"
            onPress={reset}
          >
            Try again
          </Button>
          <Link
            className="rounded-full border border-separator px-5 py-2.5 text-sm font-semibold"
            href="/"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
