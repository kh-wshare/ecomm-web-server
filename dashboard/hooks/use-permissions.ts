"use client";

import { useAuthStore } from "@/stores/auth-store";

export function usePermissions() {
  const permissions = useAuthStore(
    (state) => state.activeMerchant?.permissions ?? [],
  );

  return {
    can: (permission: string) => permissions.includes(permission),
    permissions,
  };
}
