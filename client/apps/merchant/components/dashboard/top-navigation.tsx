"use client";

import { usePathname } from "next/navigation";

import { Button } from "@repo/ui";

import { DashboardIcon } from "./dashboard-icon";
import { MerchantSwitcher } from "./merchant-switcher";
import { NotificationMenu } from "./notification-menu";
import { UserProfileMenu } from "./user-profile-menu";

import { RealtimeStatusIndicator } from "@/components/realtime/realtime-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

export function TopNavigation() {
  const pathname = usePathname();
  const toggleMobileNavigation = useUiStore(
    (state) => state.toggleMobileNavigation,
  );
  const activeMerchant = useAuthStore((state) => state.activeMerchant);
  const merchants = useAuthStore((state) => state.merchants);
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-separator bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button
        aria-label="Open navigation"
        className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground lg:hidden"
        type="button"
        onPress={toggleMobileNavigation}
      >
        <DashboardIcon name="menu" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">{pageTitle(pathname)}</h1>
        <p className="truncate text-xs text-muted">
          {activeMerchant?.merchant.name ?? "Merchant admin"}
        </p>
      </div>
      <MerchantSwitcher activeMerchant={activeMerchant} merchants={merchants} />
      <RealtimeStatusIndicator />
      <NotificationMenu />
      <UserProfileMenu activeMerchant={activeMerchant} user={user} />
    </header>
  );
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/products")) return "Products";
  if (pathname.startsWith("/categories")) return "Categories";
  if (pathname.startsWith("/inventory")) return "Inventory";
  if (pathname.startsWith("/orders")) return "Orders";
  if (pathname.startsWith("/payments")) return "Payments";
  if (pathname.startsWith("/social-posts")) return "Social commerce";
  if (pathname.startsWith("/storefront")) return "Storefront";
  if (pathname.startsWith("/settings")) return "Settings";

  return "Overview";
}
