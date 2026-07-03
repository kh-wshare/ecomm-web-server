"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DashboardIcon } from "./icon";

import type { DashboardUser, MerchantAccess } from "@/types/auth";
import { apiClient } from "@/lib/api/client";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { useAuthStore } from "@/stores/auth-store";

export function UserProfileMenu({
  activeMerchant,
  user,
}: {
  activeMerchant: MerchantAccess;
  user: DashboardUser;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post<{ success: boolean }>("/auth/logout"),
    onSettled: () => {
      authTokenStorage.clear();
      useAuthStore.getState().clear();
      queryClient.clear();
      router.replace("/auth/login");
    },
  });
  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-surface-secondary [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
          {initials || "U"}
        </span>
        <span className="hidden max-w-32 text-left xl:block">
          <span className="block truncate text-xs font-semibold">
            {user.fullName}
          </span>
          <span className="block truncate text-[11px] capitalize text-muted">
            {activeMerchant.role}
          </span>
        </span>
        <DashboardIcon
          className="hidden size-4 text-muted transition group-open:rotate-180 sm:block"
          name="chevron-down"
        />
      </summary>
      <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-separator bg-surface shadow-2xl">
        <div className="border-b border-separator px-4 py-3">
          <p className="truncate text-sm font-semibold">{user.fullName}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
          <span className="mt-2 inline-flex rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
            {activeMerchant.role}
          </span>
        </div>
        <div className="p-2">
          <Link
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted transition hover:bg-surface-secondary hover:text-foreground"
            href="/dashboard/settings/profile"
          >
            <DashboardIcon className="size-4" name="user" />
            Profile settings
          </Link>
          <button
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
            disabled={logoutMutation.isPending}
            type="button"
            onClick={() => logoutMutation.mutate()}
          >
            <DashboardIcon className="size-4" name="logout" />
            {logoutMutation.isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </details>
  );
}
