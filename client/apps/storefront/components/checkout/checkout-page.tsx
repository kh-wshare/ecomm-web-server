"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button, Radio, RadioGroup } from "@heroui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PaymentProviderCode } from "@repo/types";

import type { CheckoutContext } from "@/types/checkout";
import {
  confirmCheckoutSession,
  createCheckoutPaymentIntent,
  getCheckoutSession,
} from "@/lib/checkout/checkout-data";
import { checkoutStorage } from "@/lib/checkout/checkout-storage";
import { getErrorMessage } from "@/lib/errors/api-error";
import { formatCurrency } from "@/lib/formatters/currency";

export function CheckoutPage({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const contextValue = useSyncExternalStore(
    emptySubscribe,
    () => checkoutStorage.raw(sessionId),
    () => null,
  );
  const context = useMemo(() => parseContext(contextValue), [contextValue]);
  const checkoutQuery = useQuery({
    queryKey: ["checkout", sessionId],
    queryFn: () => getCheckoutSession(sessionId, context!.token),
    enabled: Boolean(sessionId) && Boolean(context?.token),
    refetchOnWindowFocus: true,
  });
  const [selectedProviderOverride, setSelectedProviderOverride] =
    useState<PaymentProviderCode | null>(null);
  const paymentProviders = checkoutQuery.data?.paymentProviders ?? [];
  const selectedProvider =
    selectedProviderOverride ?? paymentProviders[0]?.provider ?? null;
  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProvider) {
        throw new Error("Select a payment method to continue.");
      }
      const confirmed = await confirmCheckoutSession(sessionId, context!.token);
      if (!confirmed.order) {
        throw new Error("The order was not created. Please try again.");
      }
      const payment = await createCheckoutPaymentIntent(
        confirmed.order.id,
        context!.token,
        selectedProvider,
      );
      checkoutStorage.set(sessionId, { ...context!, payment });
      return { confirmed, payment };
    },
    onSuccess: () => router.push(`/checkout/${sessionId}/success`),
  });
  const remaining = useCountdown(checkoutQuery.data?.expiresAt);

  if (!context) {
    return (
      <CheckoutNotice
        description="This checkout link is missing its secure session token. Return to the product and start checkout again."
        title="Checkout cannot be opened"
      />
    );
  }

  if (checkoutQuery.isPending) return <CheckoutLoading />;

  if (checkoutQuery.isError) {
    return (
      <CheckoutNotice
        action={
          <Button
            type="button"
            variant="primary"
            onPress={() => checkoutQuery.refetch()}
          >
            Try again
          </Button>
        }
        description={checkoutQuery.error.message}
        title="Checkout is unavailable"
      />
    );
  }

  const checkout = checkoutQuery.data;
  if (!remaining.ready) return <CheckoutLoading />;

  const expired =
    checkout.status === "EXPIRED" ||
    checkout.status === "CANCELLED" ||
    remaining.totalSeconds <= 0;
  const canStartPayment = Boolean(selectedProvider && paymentProviders.length);

  if (expired) {
    return (
      <CheckoutNotice
        action={
          <Link
            className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white"
            href={`/${context.merchantSlug}/products/${context.productSlug}`}
          >
            Return to product
          </Link>
        }
        description="Reserved stock has been released. Start a new checkout to refresh availability and pricing."
        title="This checkout has expired"
      />
    );
  }

  return (
    <main className="min-h-dvh bg-zinc-50 px-5 py-8 text-zinc-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-950"
            href={`/${context.merchantSlug}`}
          >
            ← Continue shopping
          </Link>
          <div className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold shadow-sm">
            Secure checkout · {remaining.label}
          </div>
        </header>

        <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                Checkout
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Review and confirm
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                Inventory is reserved until {remaining.label.toLowerCase()}.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-200 px-5 py-4">
                <h2 className="font-semibold">Items</h2>
              </div>
              <div className="divide-y divide-zinc-100">
                {checkout.items.map((item) => (
                  <div
                    className="flex items-start justify-between gap-5 px-5 py-5"
                    key={item.id}
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.sku} · Qty {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(item.totalPrice, checkout.currency)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatCurrency(item.unitPrice, checkout.currency)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Payment method</h2>
              {paymentProviders.length ? (
                <RadioGroup
                  aria-label="Payment method"
                  className="mt-4 grid gap-3"
                  value={selectedProvider ?? ""}
                  onChange={(value) =>
                    setSelectedProviderOverride(value as PaymentProviderCode)
                  }
                >
                  {paymentProviders.map(({ provider }) => {
                    const option = paymentProviderOption(provider);

                    return (
                      <Radio key={provider} value={provider}>
                        <Radio.Content>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                        </Radio.Content>
                        <span className="ml-3">
                          <span className="block text-sm font-semibold">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">
                            {option.description}
                          </span>
                        </span>
                      </Radio>
                    );
                  })}
                </RadioGroup>
              ) : (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  This store has not enabled an online payment method yet.
                </div>
              )}
            </div>

            {paymentMutation.isError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
                <p className="font-semibold">Payment could not be started</p>
                <p className="mt-1 text-sm">
                  {getErrorMessage(paymentMutation.error)}
                </p>
                <p className="mt-2 text-xs">
                  Your order may already be confirmed. Retrying is safe and will
                  reuse the same payment reference.
                </p>
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <SummaryRow
                  label="Subtotal"
                  value={formatCurrency(
                    checkout.subtotalAmount,
                    checkout.currency,
                  )}
                />
                <SummaryRow
                  label="Discount"
                  value={`−${formatCurrency(
                    checkout.discountAmount,
                    checkout.currency,
                  )}`}
                />
                <SummaryRow
                  label="Fees"
                  value={formatCurrency(checkout.feeAmount, checkout.currency)}
                />
                <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>
                    {formatCurrency(checkout.totalAmount, checkout.currency)}
                  </dd>
                </div>
              </dl>
              <Button
                className="mt-6 w-full"
                isDisabled={!canStartPayment || paymentMutation.isPending}
                type="button"
                variant="primary"
                onPress={() => paymentMutation.mutate()}
              >
                {paymentMutation.isPending
                  ? "Confirming payment…"
                  : "Confirm payment"}
              </Button>
              <p className="mt-3 text-center text-[11px] leading-4 text-zinc-500">
                Final payment status may remain pending until the provider sends
                confirmation.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function paymentProviderOption(provider: PaymentProviderCode) {
  const options: Record<
    PaymentProviderCode,
    { description: string; label: string }
  > = {
    HMAC: {
      label: "Secure gateway",
      description:
        "Creates a protected payment reference. Settlement is confirmed by the provider.",
    },
    KHQR: {
      label: "Bakong KHQR",
      description:
        "Pay with a KHQR-compatible banking app after the payment reference is created.",
    },
    ABA_PAYWAY: {
      label: "ABA PayWay",
      description:
        "Pay through ABA PayWay using supported ABA, card, or KHQR payment options.",
    },
  };

  return options[provider];
}

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const totalSeconds = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1_000))
    : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    ready: now > 0,
    totalSeconds,
    label: `${minutes}:${String(seconds).padStart(2, "0")} remaining`,
  };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <main className="min-h-dvh bg-zinc-50 px-5 py-10">
      <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[1fr_380px]">
        <div className="h-[620px] animate-pulse rounded-2xl bg-zinc-200" />
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    </main>
  );
}

function CheckoutNotice({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-50 px-6 text-center text-zinc-950">
      <div className="max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
          Secure checkout
        </p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
        {action && <div className="mt-7">{action}</div>}
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
