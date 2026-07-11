"use client";

import { Form } from "@heroui/react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button, Input } from "@/components/ui/hero-controls";
import type { PaymentProviderCode } from "@/types/payment";
import { usePermissions } from "@/hooks/use-permissions";
import {
  connectPaymentProvider,
  disconnectPaymentProvider,
  getPaymentProviders,
} from "@/lib/payments/payment-data";
import { queryKeys } from "@/lib/query/keys";
import { notify } from "@/lib/toast/notify";

const plannedProviders = [
  {
    name: "Stripe",
    description: "Cards, wallets, and international payment methods.",
  },
  {
    name: "PayPal",
    description: "PayPal wallet and account-based checkout.",
  },
  {
    name: "Regional QR",
    description: "Local QR rails for supported merchant regions.",
  },
  {
    name: "Manual bank transfer",
    description: "Offline transfer instructions with manual reconciliation.",
  },
];

export function PaymentProviderSettings() {
  const { can } = usePermissions();
  const canManage = can("payment.provider_manage");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const providersQuery = useQuery({
    queryKey: queryKeys.payments.providers(),
    queryFn: getPaymentProviders,
    enabled: canManage,
  });
  const disconnectMutation = useMutation({
    mutationFn: (provider: PaymentProviderCode) =>
      disconnectPaymentProvider(provider),
    onSuccess: async () => {
      notify.success("Payment gateway disconnected");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.payments.providers(),
      });
    },
    onError: (error) => notify.error(error, "Unable to disconnect gateway"),
  });

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        Payment provider management permission is required.
      </div>
    );
  }

  const hmac = providersQuery.data?.find(
    (provider) => provider.provider === "HMAC",
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Payments</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Provider settings
          </h2>
          <p className="mt-2 text-sm text-muted">
            Configure payment gateways and review adapter availability.
          </p>
        </div>
        <Button
          className="inline-flex h-10 items-center rounded-xl border border-separator px-4 text-sm font-semibold"
          type="button"
          onPress={() => router.push("/dashboard/payments/transactions")}
        >
          View transactions
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProviderCard
          action={
            hmac?.status === "ACTIVE"
              ? {
                  label: disconnectMutation.isPending
                    ? "Disconnecting…"
                    : "Disconnect",
                  onClick: () => disconnectMutation.mutate("HMAC"),
                }
              : {
                  label: hmac ? "Reconnect" : "Connect",
                  onClick: () => setConnecting(true),
                }
          }
          description="A signed webhook gateway for custom or regional provider integrations."
          isLoading={providersQuery.isPending}
          name="HMAC webhook gateway"
          status={hmac?.status ?? "NOT_CONNECTED"}
        />
        {plannedProviders.map((provider) => (
          <ProviderCard
            description={provider.description}
            key={provider.name}
            name={provider.name}
            status="ADAPTER_PLANNED"
          />
        ))}
      </div>

      <div className="rounded-2xl border border-separator bg-surface p-5 text-sm text-muted">
        Stripe, PayPal, regional QR, and bank-transfer cards are ready for
        adapter work, but cannot be connected until their backend adapters and
        credential flows are implemented. The HMAC gateway is the currently
        supported provider.
      </div>

      {connecting && (
        <ConnectProviderDialog
          onClose={() => setConnecting(false)}
          onConnected={() => {
            setConnecting(false);
            void queryClient.invalidateQueries({
              queryKey: queryKeys.payments.providers(),
            });
          }}
        />
      )}
    </section>
  );
}

function ProviderCard({
  action,
  description,
  isLoading = false,
  name,
  status,
}: {
  action?: { label: string; onClick: () => void };
  description: string;
  isLoading?: boolean;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "NOT_CONNECTED" | "ADAPTER_PLANNED";
}) {
  return (
    <article className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-11 place-items-center rounded-xl bg-accent/10 text-lg font-black text-accent">
          {name.charAt(0)}
        </div>
        <ProviderStatusBadge status={isLoading ? "LOADING" : status} />
      </div>
      <h3 className="mt-5 font-semibold">{name}</h3>
      <p className="mt-2 min-h-10 text-sm leading-5 text-muted">
        {description}
      </p>
      {action && !isLoading && (
        <Button
          className="mt-5 h-10 rounded-xl border border-separator px-4 text-sm font-semibold hover:bg-surface-secondary"
          type="button"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </article>
  );
}

function ProviderStatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-success/10 text-success"
      : status === "INACTIVE"
        ? "bg-danger/10 text-danger"
        : "bg-surface-secondary text-muted";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function ConnectProviderDialog({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: () => void;
}) {
  const [webhookSecret, setWebhookSecret] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      connectPaymentProvider({
        provider: "HMAC",
        webhookSecret,
        config: accountLabel ? { accountLabel } : undefined,
      }),
    onSuccess: () => {
      notify.success("Payment gateway connected");
      onConnected();
    },
    onError: (error) => notify.error(error, "Unable to connect gateway"),
  });
  const valid = webhookSecret.length >= 16 && webhookSecret.length <= 200;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
    >
      <Form
        className="w-full max-w-md rounded-2xl border border-separator bg-surface p-5 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) mutation.mutate();
        }}
      >
        <h2 className="text-lg font-semibold">Connect HMAC gateway</h2>
        <p className="mt-2 text-sm text-muted">
          The secret is encrypted by the API and is never returned.
        </p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium">
            Account label
          </span>
          <Input
            className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
            maxLength={80}
            placeholder="Primary checkout gateway"
            value={accountLabel}
            onChange={(event) => setAccountLabel(event.target.value)}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">
            Webhook signing secret
          </span>
          <Input
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
            maxLength={200}
            minLength={16}
            placeholder="At least 16 characters"
            required
            type="password"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <Button
            className="h-10 rounded-xl border border-separator px-4 text-sm font-semibold"
            disabled={mutation.isPending}
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            disabled={!valid || mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "Connecting…" : "Connect gateway"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
