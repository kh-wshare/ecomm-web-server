"use client";

import { usePathname } from "next/navigation";

import { Button, Chip } from "@repo/ui";

import { DashboardIcon } from "./dashboard-icon";

import { useUiStore } from "@/stores/ui-store";

export function TopNavigation() {
  const pathname = usePathname();
  const toggleMobileNavigation = useUiStore(
    (state) => state.toggleMobileNavigation,
  );

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-slate-50/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8 dark:border-zinc-800 dark:bg-zinc-950/85">
      <Button
        aria-label="Open navigation"
        className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-950 lg:hidden dark:hover:bg-zinc-900 dark:hover:text-white"
        type="button"
        onPress={toggleMobileNavigation}
      >
        <DashboardIcon name="menu" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">{pageTitle(pathname)}</h1>
        <p className="truncate text-xs text-slate-500 dark:text-zinc-400">
          Merchant admin
        </p>
      </div>
      <Chip color="accent" variant="soft">
        Foundation
      </Chip>
    </header>
  );
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/products")) return "Products";
  if (pathname.startsWith("/inventory")) return "Inventory";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/payments")) return "Payments";
  if (pathname.startsWith("/social-posts")) return "Social commerce";
  if (pathname.startsWith("/storefront")) return "Storefront";
  if (pathname.startsWith("/settings")) return "Settings";

  return "Overview";
}
