"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { unwrapApiResponseData } from "@repo/api-client";
import { Label, ListBox, Select } from "@repo/ui";

import { DashboardIcon } from "./dashboard-icon";

import { SESSION_SWITCH_MERCHANT_PATH } from "@/lib/auth/session";
import { notify } from "@/lib/toast/notify";
import { useAuthStore } from "@/stores/auth-store";
import type { CurrentProfile, MerchantAccess } from "@/types/auth";

export function MerchantSwitcher({
  activeMerchant,
  merchants,
}: {
  activeMerchant: MerchantAccess | null;
  merchants: MerchantAccess[];
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const switchMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      const response = await fetch(SESSION_SWITCH_MERCHANT_PATH, {
        body: JSON.stringify({ merchantId }),
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Unable to switch merchant";

        throw new Error(message);
      }

      return unwrapApiResponseData<CurrentProfile>(payload);
    },
    onError: (error) => notify.error(error, "Unable to switch merchant"),
    onSuccess: async (session) => {
      useAuthStore.getState().setSession(session);
      await queryClient.invalidateQueries();
      notify.success(
        `Switched to ${session.activeMerchant?.merchant.name ?? "merchant"}`,
      );
      router.refresh();
    },
  });

  if (!activeMerchant || merchants.length === 0) return null;

  if (merchants.length === 1) {
    return (
      <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-separator bg-surface px-3 py-2 text-sm font-medium text-foreground sm:flex">
        <DashboardIcon className="shrink-0 text-muted" name="globe" />
        <span className="truncate">{activeMerchant.merchant.name}</span>
      </div>
    );
  }

  return (
    <Select
      aria-label="Active merchant"
      className="hidden min-w-0 md:block md:w-56"
      value={activeMerchant.merchant.id}
      variant="secondary"
      onChange={(value) => {
        const merchantId = selectValue(value);
        if (!merchantId || merchantId === activeMerchant.merchant.id) return;
        switchMutation.mutate(merchantId);
      }}
    >
      <Label className="sr-only">Active merchant</Label>
      <Select.Trigger className="h-10 rounded-lg border border-separator bg-surface px-3 text-sm shadow-none transition hover:border-muted">
        <DashboardIcon className="mr-2 shrink-0 text-muted" name="globe" />
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="rounded-lg border border-separator bg-surface p-1 shadow-lg">
        <ListBox>
          {merchants.map(({ merchant }) => (
            <ListBox.Item
              className="rounded-md px-3 py-2 text-sm outline-none transition hover:bg-surface-secondary data-[focused=true]:bg-surface-secondary"
              id={merchant.id}
              key={merchant.id}
              textValue={merchant.name}
            >
              <span>{merchant.name}</span>
              <ListBox.ItemIndicator className="text-primary" />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function selectValue(value: unknown) {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "target" in value &&
    value.target &&
    typeof value.target === "object" &&
    "value" in value.target &&
    typeof value.target.value === "string"
  ) {
    return value.target.value;
  }

  return null;
}
