"use client";

import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
} from "@heroui/react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { PaymentProviderCode } from "@repo/types";
import { usePermissions } from "@/hooks/use-permissions";
import {
  connectPaymentProvider,
  disconnectPaymentProvider,
  getPaymentProviders,
} from "@/lib/payments/payment-data";
import { queryKeys } from "@repo/query-client";
import { notify } from "@/lib/toast/notify";

type ProviderField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "url";
  defaultValue?: string;
  options?: Array<{ label: string; value: string }>;
};

type ProviderDefinition = {
  code: PaymentProviderCode;
  name: string;
  description: string;
  providerSecretLabel?: string;
  webhookSecretLabel?: string;
  fields: ProviderField[];
};

const providerDefinitions: ProviderDefinition[] = [
  {
    code: "HMAC",
    name: "HMAC webhook gateway",
    description:
      "A signed webhook gateway for custom or regional provider integrations.",
    webhookSecretLabel: "Webhook signing secret",
    fields: [
      {
        key: "accountLabel",
        label: "Account label",
        placeholder: "Primary checkout gateway",
      },
    ],
  },
  {
    code: "KHQR",
    name: "Bakong KHQR",
    description:
      "Bakong KHQR payment settings using a Bakong developer token and merchant account.",
    providerSecretLabel: "Bakong developer token",
    fields: [
      {
        key: "accountId",
        label: "Bakong account ID",
        placeholder: "merchant_name@bank",
        required: true,
      },
      {
        key: "merchantName",
        label: "Merchant name",
        placeholder: "Your shop name",
        required: true,
      },
      {
        key: "merchantCity",
        label: "Merchant city",
        placeholder: "Phnom Penh",
        defaultValue: "Phnom Penh",
      },
      {
        key: "baseUrl",
        label: "Bakong API base URL",
        placeholder: "https://api-bakong.nbc.gov.kh",
        type: "url",
      },
      {
        key: "sourceAppName",
        label: "Source app name",
        placeholder: "Storefront checkout",
      },
      {
        key: "sourceAppIconUrl",
        label: "Source app icon URL",
        type: "url",
      },
      {
        key: "sourceAppCallbackUrl",
        label: "App callback URL",
        type: "url",
      },
    ],
  },
  {
    code: "ABA_PAYWAY",
    name: "ABA PayWay",
    description:
      "ABA PayWay hosted checkout and QR settings for cards, ABA PAY, and KHQR.",
    providerSecretLabel: "PayWay API key",
    webhookSecretLabel: "Callback signing secret",
    fields: [
      {
        key: "merchantId",
        label: "Merchant ID",
        placeholder: "keng.dara.online",
        required: true,
      },
      {
        key: "environment",
        label: "Environment",
        defaultValue: "SANDBOX",
        required: true,
        options: [
          { label: "Sandbox", value: "SANDBOX" },
          { label: "Production", value: "PRODUCTION" },
        ],
      },
      {
        key: "paymentOption",
        label: "Payment option",
        defaultValue: "abapay_khqr",
        required: true,
        options: [
          { label: "ABA PAY + KHQR", value: "abapay_khqr" },
          { label: "Cards", value: "cards" },
          { label: "ABA PAY", value: "abapay" },
          { label: "KHQR", value: "khqr" },
        ],
      },
      {
        key: "baseUrl",
        label: "PayWay base URL",
        placeholder: "Uses environment default when blank",
        type: "url",
      },
      {
        key: "callbackUrl",
        label: "Callback URL",
        type: "url",
      },
      {
        key: "returnUrl",
        label: "Return URL",
        type: "url",
      },
      {
        key: "cancelUrl",
        label: "Cancel URL",
        type: "url",
      },
      {
        key: "qrImageTemplate",
        label: "QR image template",
        placeholder: "template3_color",
        defaultValue: "template3_color",
      },
    ],
  },
];

export function PaymentProviderSettings() {
  const { can } = usePermissions();
  const canManage = can("payments.manage");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connectingProvider, setConnectingProvider] =
    useState<ProviderDefinition | null>(null);
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
          type="button"
          variant="secondary"
          onPress={() => router.push("/payments/transactions")}
        >
          View transactions
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {providerDefinitions.map((definition) => {
          const provider = providersQuery.data?.find(
            (item) => item.provider === definition.code,
          );
          const isActive = provider?.status === "ACTIVE";

          return (
            <ProviderCard
              actions={[
                {
                  label: provider ? "Update" : "Connect",
                  onClick: () => setConnectingProvider(definition),
                },
                ...(isActive
                  ? [
                      {
                        label: disconnectMutation.isPending
                          ? "Disconnecting…"
                          : "Disconnect",
                        onClick: () =>
                          disconnectMutation.mutate(definition.code),
                      },
                    ]
                  : []),
              ]}
              description={definition.description}
              isLoading={providersQuery.isPending}
              key={definition.code}
              name={definition.name}
              status={provider?.status ?? "NOT_CONNECTED"}
            />
          );
        })}
        {[
          {
            name: "Stripe",
            description: "Cards, wallets, and international payment methods.",
          },
          {
            name: "PayPal",
            description: "PayPal wallet and account-based checkout.",
          },
          {
            name: "Manual bank transfer",
            description:
              "Offline transfer instructions with manual reconciliation.",
          },
        ].map((provider) => (
          <ProviderCard
            description={provider.description}
            key={provider.name}
            name={provider.name}
            status="ADAPTER_PLANNED"
          />
        ))}
      </div>

      <div className="rounded-2xl border border-separator bg-surface p-5 text-sm text-muted">
        KHQR and ABA PayWay credentials are encrypted by the API. Payment
        intents can use active provider records while provider-hosted checkout
        and QR response handling can be layered onto these adapter settings.
      </div>

      {connectingProvider && (
        <ConnectProviderDialog
          definition={connectingProvider}
          existingConfig={
            providersQuery.data?.find(
              (provider) => provider.provider === connectingProvider.code,
            )?.config
          }
          onClose={() => setConnectingProvider(null)}
          onConnected={() => {
            setConnectingProvider(null);
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
  actions,
  description,
  isLoading = false,
  name,
  status,
}: {
  actions?: Array<{ label: string; onClick: () => void }>;
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
      {actions?.length && !isLoading && (
        <div className="mt-5 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="secondary"
              onPress={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
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
  definition,
  existingConfig,
  onClose,
  onConnected,
}: {
  definition: ProviderDefinition;
  existingConfig?: Record<string, unknown>;
  onClose: () => void;
  onConnected: () => void;
}) {
  const initialSettings = Object.fromEntries(
    definition.fields.map((field) => [
      field.key,
      stringSetting(existingConfig?.[field.key]) ?? field.defaultValue ?? "",
    ]),
  );
  const [settings, setSettings] =
    useState<Record<string, string>>(initialSettings);
  const [providerSecret, setProviderSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      connectPaymentProvider({
        provider: definition.code,
        ...(providerSecret ? { providerSecret } : {}),
        ...(webhookSecret ? { webhookSecret } : {}),
        config: Object.fromEntries(
          Object.entries(settings).filter(([, value]) => value.trim()),
        ),
      }),
    onSuccess: () => {
      notify.success("Payment gateway connected");
      onConnected();
    },
    onError: (error) => notify.error(error, "Unable to connect gateway"),
  });
  const hasRequiredFields = definition.fields.every(
    (field) => !field.required || settings[field.key]?.trim(),
  );
  const needsProviderSecret = Boolean(definition.providerSecretLabel);
  const needsWebhookSecret = Boolean(definition.webhookSecretLabel);
  const valid =
    hasRequiredFields &&
    (!needsProviderSecret ||
      (providerSecret.length >= 8 && providerSecret.length <= 1000)) &&
    (!needsWebhookSecret ||
      webhookSecret.length === 0 ||
      (webhookSecret.length >= 16 && webhookSecret.length <= 200)) &&
    (definition.code !== "HMAC" || webhookSecret.length >= 16);

  return (
    <Modal>
      <Modal.Backdrop
        isOpen
        className="bg-black/55 backdrop-blur-sm"
        variant="blur"
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
        <Modal.Container
          className="items-end p-0 sm:items-center sm:p-4"
          scroll="inside"
          size="lg"
        >
          <Modal.Dialog className="max-h-[92dvh] w-full overflow-hidden rounded-t-3xl border border-separator bg-surface shadow-2xl sm:rounded-2xl">
            <Form
              className="contents"
              validationBehavior="native"
              onSubmit={(event) => {
                event.preventDefault();
                if (valid) mutation.mutate();
              }}
            >
              <Modal.CloseTrigger className="absolute right-4 top-4 rounded-full border border-separator bg-surface p-2 text-muted transition hover:bg-surface-secondary hover:text-foreground" />
              <Modal.Header className="border-b border-separator px-5 py-5 sm:px-6">
                <div className="min-w-0 pr-10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Payment adapter
                  </p>
                  <Modal.Heading className="mt-1 text-xl font-semibold tracking-tight">
                    Connect {definition.name}
                  </Modal.Heading>
                  <p className="mt-2 text-sm leading-5 text-muted">
                    Secrets are encrypted by the API and are never returned.
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body className="max-h-[65dvh] overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {definition.fields.map((field) => (
                    <ProviderSettingField
                      field={field}
                      key={field.key}
                      value={settings[field.key] ?? ""}
                      onChange={(value) =>
                        setSettings((current) => ({
                          ...current,
                          [field.key]: value,
                        }))
                      }
                    />
                  ))}
                  {definition.providerSecretLabel && (
                    <SecretInput
                      label={definition.providerSecretLabel}
                      maxLength={1000}
                      minLength={8}
                      value={providerSecret}
                      onChange={setProviderSecret}
                    />
                  )}
                  {definition.webhookSecretLabel && (
                    <SecretInput
                      label={definition.webhookSecretLabel}
                      maxLength={200}
                      minLength={16}
                      required={definition.code === "HMAC"}
                      value={webhookSecret}
                      onChange={setWebhookSecret}
                    />
                  )}
                </div>
              </Modal.Body>

              <Modal.Footer className="border-t border-separator bg-surface px-5 py-4 sm:px-6">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    isDisabled={mutation.isPending}
                    type="button"
                    variant="secondary"
                    onPress={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    isDisabled={!valid || mutation.isPending}
                    type="submit"
                    variant="primary"
                  >
                    {mutation.isPending ? "Connecting…" : "Connect gateway"}
                  </Button>
                </div>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ProviderSettingField({
  field,
  onChange,
  value,
}: {
  field: ProviderField;
  onChange: (value: string) => void;
  value: string;
}) {
  if (field.options) {
    return (
      <Select
        className="w-full"
        isRequired={field.required}
        name={field.key}
        value={value}
        variant="secondary"
        onChange={(nextValue) => {
          if (typeof nextValue === "string") onChange(nextValue);
        }}
      >
        <Label className="mb-1.5 block text-sm font-medium">
          {field.label}
        </Label>
        <Select.Trigger className="h-11 rounded-xl border border-separator bg-background px-3 text-sm shadow-none">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <FieldError className="mt-1.5 text-xs text-danger" />
        <Select.Popover className="rounded-xl border border-separator bg-surface p-1 shadow-xl">
          <ListBox>
            {field.options.map((option) => (
              <ListBox.Item
                className="rounded-lg px-3 py-2 text-sm outline-none transition hover:bg-surface-secondary data-[focused=true]:bg-surface-secondary"
                id={option.value}
                key={option.value}
                textValue={option.label}
              >
                <span>{option.label}</span>
                <ListBox.ItemIndicator className="text-accent" />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    );
  }

  return (
    <TextField
      className="w-full"
      isRequired={field.required}
      name={field.key}
      type={field.type ?? "text"}
      value={value}
      onChange={onChange}
    >
      <Label className="mb-1.5 block text-sm font-medium">{field.label}</Label>
      <Input
        className="h-11 rounded-xl border border-separator bg-background px-3 text-sm shadow-none"
        maxLength={500}
        placeholder={field.placeholder}
      />
      <FieldError className="mt-1.5 text-xs text-danger" />
    </TextField>
  );
}

function SecretInput({
  label,
  maxLength,
  minLength,
  onChange,
  required = true,
  value,
}: {
  label: string;
  maxLength: number;
  minLength: number;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <TextField
      className="w-full"
      isRequired={required}
      maxLength={maxLength}
      minLength={minLength}
      type="password"
      value={value}
      onChange={onChange}
    >
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Input
        autoComplete="new-password"
        className="h-11 rounded-xl border border-separator bg-background px-3 text-sm shadow-none"
        placeholder={`At least ${minLength} characters`}
      />
      <FieldError className="mt-1.5 text-xs text-danger" />
    </TextField>
  );
}

function stringSetting(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
