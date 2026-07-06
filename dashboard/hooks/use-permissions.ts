"use client";

import { useCallback, useMemo } from "react";

import { useAuthStore } from "@/stores/auth-store";

const EMPTY_PERMISSIONS: string[] = [];

export function usePermissions() {
  const permissions = useAuthStore(
    (state) => state.activeMerchant?.permissions ?? EMPTY_PERMISSIONS,
  );
  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  return useMemo(() => ({ can, permissions }), [can, permissions]);
}
