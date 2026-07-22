"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { Button } from "@repo/ui";

import { DashboardIcon } from "./dashboard-icon";

import { SESSION_LOGOUT_PATH } from "@/lib/auth/session";
import { useCloseDetailsOnOutsideClick } from "@/hooks/use-close-details-on-outside-click";
import { notify } from "@/lib/toast/notify";
import { useAuthStore } from "@/stores/auth-store";
import type { MerchantAccess } from "@/types/auth";
import type { AuthUser } from "@repo/types";

export function UserProfileMenu({
  activeMerchant,
  user,
}: {
  activeMerchant: MerchantAccess | null;
  user: AuthUser | null;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  useCloseDetailsOnOutsideClick(menuRef);
  const logout = useMutation({
    mutationFn: async () => {
      const response = await fetch(SESSION_LOGOUT_PATH, {
        credentials: "include",
        method: "POST",
      });

      if (!response.ok) throw new Error("Unable to sign out");
    },
    onError: (error) => notify.error(error, "Unable to sign out"),
    onSuccess: () => {
      useAuthStore.getState().clear();
      queryClient.clear();
      router.replace("/auth/login");
      router.refresh();
    },
  });
  const role = activeMerchant?.role ?? "merchant";
  const name = user?.fullName || user?.email || "Merchant";

  return (
    <details className="group relative" ref={menuRef}>
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 text-muted transition hover:bg-primary/20 hover:text-primary group-open:bg-primary/20 group-open:text-primary [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold uppercase text-white">
          {initials(name)}
        </span>
        <DashboardIcon
          className="hidden text-muted sm:block"
          name="chevronDown"
        />
        <span className="sr-only">User menu</span>
      </summary>
      <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-lg border border-separator bg-surface shadow-lg">
        <div className="border-b border-separator px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="truncate text-xs text-muted">
            {user?.email ?? activeMerchant?.merchant.name ?? "Merchant admin"}
          </p>
          <p className="mt-2 inline-flex rounded-full bg-surface-secondary px-2 py-1 text-[11px] font-semibold capitalize text-muted">
            {role.replaceAll("_", " ")}
          </p>
        </div>
        <Button
          className="flex h-auto w-full items-center justify-start gap-2 rounded-none px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger/10"
          isDisabled={logout.isPending}
          type="button"
          variant="ghost"
          onPress={() => logout.mutate()}
        >
          <DashboardIcon name="logout" />
          Sign out
        </Button>
      </div>
    </details>
  );
}

function initials(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const letters = parts.length
    ? parts.slice(0, 2).map((part) => part[0])
    : value.slice(0, 2).split("");

  return letters.join("").toUpperCase() || "M";
}
