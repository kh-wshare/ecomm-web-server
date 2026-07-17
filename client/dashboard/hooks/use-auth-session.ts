"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { CurrentProfile } from "@/types/auth";
import { apiClient } from "@/lib/api/client";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { ApiError } from "@/lib/errors/api-error";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;
const getServerTokenSnapshot = () => null;

export function useAuthSession() {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const accessToken = useSyncExternalStore(
    authTokenStorage.subscribe,
    authTokenStorage.getAccessToken,
    getServerTokenSnapshot,
  );
  const merchantId = useSyncExternalStore(
    authTokenStorage.subscribe,
    authTokenStorage.getMerchantId,
    getServerTokenSnapshot,
  );
  const profileQuery = useQuery({
    queryKey: queryKeys.merchant.current(),
    queryFn: async () => {
      const response = await apiClient.get<CurrentProfile>("/auth/me");

      return response.data;
    },
    enabled: isHydrated && Boolean(accessToken),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status >= 500 && failureCount < 1,
  });
  const unauthorized =
    profileQuery.error instanceof ApiError && profileQuery.error.status === 401;

  useEffect(() => {
    if (!isHydrated || (accessToken && !unauthorized)) return;

    authTokenStorage.clear();
    useAuthStore.getState().clear();
    router.replace("/auth/login");
  }, [accessToken, isHydrated, router, unauthorized]);

  const activeMerchant =
    profileQuery.data?.merchants.find(
      ({ merchant }) => merchant.id === merchantId,
    ) ??
    profileQuery.data?.merchants[0] ??
    null;

  useEffect(() => {
    if (!activeMerchant || merchantId) return;

    authTokenStorage.setMerchantId(activeMerchant.merchant.id);
  }, [activeMerchant, merchantId]);

  useEffect(() => {
    if (!profileQuery.data) return;

    useAuthStore.getState().setSession({
      activeMerchant,
      merchants: profileQuery.data.merchants,
      user: profileQuery.data.user,
    });
  }, [activeMerchant, profileQuery.data]);

  if (profileQuery.error && !unauthorized) throw profileQuery.error;

  return {
    activeMerchant,
    isChecking:
      !isHydrated || !accessToken || unauthorized || profileQuery.isPending,
    profile: profileQuery.data ?? null,
  };
}
