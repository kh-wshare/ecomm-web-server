"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import type { CheckoutContext } from "@/types/checkout";
import { getCheckoutSession } from "@/lib/checkout/checkout-data";
import { checkoutStorage } from "@/lib/checkout/checkout-storage";
import { formatCurrency } from "@/lib/formatters/currency";

export function CheckoutSuccess({ sessionId }: { sessionId: string }) {
  const contextValue = useSyncExternalStore(
    emptySubscribe,
    () => checkoutStorage.raw(sessionId),
    () => null,
  );
  const context = useMemo(() => parseContext(contextValue), [contextValue]);
  const checkoutQuery = useQuery({
    queryKey: ["checkout", sessionId],
    queryFn: () => getCheckoutSession(sessionId, context!.token),
    enabled: Boolean(context),
  });

  if (!context) {
    return (
      <SuccessNotice
        description="The secure checkout context is missing from this browser session."
        title="Receipt unavailable"
      />
    );
  }

  if (checkoutQuery.isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-zinc-50">
        <div className="h-96 w-full max-w-2xl animate-pulse rounded-3xl bg-zinc-200" />
      </main>
    );
  }

  if (checkoutQuery.isError) {
    return (
      <SuccessNotice
        description={checkoutQuery.error.message}
        title="Order unavailable"
      />
    );
  }

  const checkout = checkoutQuery.data;
  const order = checkout.order;
  if (!order) {
    return (
      <SuccessNotice
        description="The order has not been confirmed for this checkout."
        title="Order unavailable"
      />
    );
  }
  const paymentStatus = context.payment?.status ?? "PENDING";

  return (
    <main className="min-h-dvh bg-zinc-50 px-5 py-10 text-zinc-950 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Order confirmed
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Thank you for your order
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Order{" "}
            <span className="font-semibold text-zinc-950">
              {order.orderNumber}
            </span>{" "}
            is reserved and awaiting final provider confirmation.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Status label="Order" value={order.status} />
            <Status label="Payment" value={paymentStatus} />
          </div>

          <section className="mt-8 border-t border-zinc-200 pt-7">
            <h2 className="font-semibold">Receipt summary</h2>
            <div className="mt-4 divide-y divide-zinc-100">
              {checkout.items.map((item) => (
                <div
                  className="flex justify-between gap-5 py-4 text-sm"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Qty {item.quantity} · {item.sku}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(item.totalPrice, checkout.currency)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-5 font-semibold">
              <span>Total</span>
              <span>
                {formatCurrency(checkout.totalAmount, checkout.currency)}
              </span>
            </div>
          </section>

          {context.payment && (
            <div className="mt-7 rounded-xl bg-zinc-50 p-4">
              <p className="text-xs font-medium text-zinc-500">
                Payment reference
              </p>
              <p className="mt-1 break-all font-mono text-xs">
                {context.payment.providerTransactionId}
              </p>
            </div>
          )}

          <Link
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-bold text-white"
            href={`/${context.merchantSlug}`}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  const pending = ["PENDING", "PENDING_PAYMENT"].includes(value);
  return (
    <div className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs">
      <span className="text-zinc-500">{label}: </span>
      <span
        className={`font-bold ${
          pending ? "text-amber-700" : "text-emerald-700"
        }`}
      >
        {value.replaceAll("_", " ")}
      </span>
    </div>
  );
}

function SuccessNotice({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-6 text-center text-zinc-950">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
        <Link
          className="mt-7 inline-flex rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white"
          href="/"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}

function parseContext(value: string | null): CheckoutContext | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as CheckoutContext;
  } catch {
    return null;
  }
}

function emptySubscribe() {
  return () => undefined;
}
