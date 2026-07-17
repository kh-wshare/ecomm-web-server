"use client";

import { useCallback, useMemo } from "react";

import type { PermissionCode } from "@repo/types";

import { useAuthStore } from "@/stores/auth-store";

const EMPTY_PERMISSIONS: PermissionCode[] = [];

export function usePermissions() {
  const permissions = useAuthStore(
    (state) => state.activeMerchant?.permissions ?? EMPTY_PERMISSIONS,
  );
  const can = useCallback(
    (permission: PermissionCode) => permissions.includes(permission),
    [permissions],
  );

  return useMemo(() => ({ can, permissions }), [can, permissions]);
}
