"use client";

import Link from "next/link";

export default function CheckoutSuccessError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-xl rounded-3xl border border-danger/30 bg-surface p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
          Receipt unavailable
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Order status could not load</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {error.message || "The checkout receipt could not be restored."}
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          href="/"
        >
          Return to storefront
        </Link>
      </div>
    </main>
  );
}
