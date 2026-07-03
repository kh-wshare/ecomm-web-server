"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { DashboardIcon } from "./icon";

import type { MerchantAccess, SwitchMerchantResult } from "@/types/auth";
import { apiClient } from "@/lib/api/client";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { notify } from "@/lib/toast/notify";
import { useAuthStore } from "@/stores/auth-store";

export function MerchantSwitcher({
  activeMerchant,
  merchants,
}: {
  activeMerchant: MerchantAccess;
  merchants: MerchantAccess[];
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const switchMutation = useMutation({
    mutationFn: async (merchantId: string) => {
      const response = await apiClient.post<SwitchMerchantResult>(
        "/auth/switch-merchant",
        { merchantId },
      );

      return response.data;
    },
    onSuccess: async ({ accessToken, activeMerchant: nextMerchant }) => {
      authTokenStorage.setSession(accessToken, nextMerchant.merchant.id);
      useAuthStore.getState().setActiveMerchant(nextMerchant);
      await queryClient.invalidateQueries();
      notify.success(`Switched to ${nextMerchant.merchant.name}`);
      router.refresh();
    },
    onError: (error) => notify.error(error, "Unable to switch merchant"),
  });

  return (
    <label className="relative min-w-0 flex-1 md:flex-none">
      <span className="sr-only">Active merchant</span>
      <DashboardIcon
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        name="globe"
      />
      <select
        aria-label="Active merchant"
        className="h-10 w-full min-w-0 appearance-none truncate rounded-xl border border-separator bg-surface py-0 pl-9 pr-8 text-sm font-medium outline-none transition hover:bg-surface-secondary focus:border-accent md:w-56"
        disabled={switchMutation.isPending}
        value={activeMerchant.merchant.id}
        onChange={(event) => switchMutation.mutate(event.target.value)}
      >
        {merchants.map(({ merchant }) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.name}
          </option>
        ))}
      </select>
      <DashboardIcon
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        name="chevron-down"
      />
    </label>
  );
}
