"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { unwrapApiResponseData } from "@repo/api-client";
import { queryKeys } from "@repo/query-client";

import { SESSION_ME_PATH } from "@/lib/auth/session";
import { useAuthStore } from "@/stores/auth-store";
import type { CurrentProfile } from "@/types/auth";

export function useAuthSession() {
  const profileQuery = useQuery({
    queryFn: async () => {
      const response = await fetch(SESSION_ME_PATH, {
        credentials: "include",
      });

      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Unable to load merchant session");

      return unwrapApiResponseData<CurrentProfile>(await response.json());
    },
    queryKey: queryKeys.auth.session(),
    retry: false,
  });
  const activeMerchant = profileQuery.data?.activeMerchant ?? null;

  useEffect(() => {
    if (!profileQuery.data) return;

    useAuthStore.getState().setSession({
      activeMerchant,
      merchants: profileQuery.data.merchants,
      user: profileQuery.data.user,
    });
  }, [activeMerchant, profileQuery.data]);

  useEffect(() => {
    if (profileQuery.isPending || profileQuery.data) return;

    useAuthStore.getState().clear();
  }, [profileQuery.data, profileQuery.isPending]);

  return {
    activeMerchant,
    isAuthenticated: Boolean(profileQuery.data),
    isChecking: profileQuery.isPending,
    profile: profileQuery.data ?? null,
  };
}
