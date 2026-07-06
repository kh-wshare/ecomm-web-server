"use client";

import { usePathname } from "next/navigation";

import { DashboardIcon } from "./icon";
import { MerchantSwitcher } from "./merchant-switcher";
import { NotificationMenu } from "./notification-menu";
import { UserProfileMenu } from "./user-profile-menu";

import { Button } from "@/components/ui/hero-controls";
import type { CurrentProfile, MerchantAccess } from "@/types/auth";
import { RealtimeStatusIndicator } from "@/components/realtime/realtime-provider";
import { useUiStore } from "@/stores/ui-store";

export function TopNavigation({
  activeMerchant,
  profile,
}: {
  activeMerchant: MerchantAccess;
  profile: CurrentProfile;
}) {
  const pathname = usePathname();
  const toggleMobileNavigation = useUiStore(
    (state) => state.toggleMobileNavigation,
  );

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-separator bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button
        aria-label="Open navigation"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface hover:text-foreground lg:hidden"
        type="button"
        onClick={toggleMobileNavigation}
      >
        <DashboardIcon name="menu" />
      </Button>
      <div className="hidden min-w-0 flex-1 lg:block">
        <h1 className="truncate text-lg font-semibold">
          {pageTitle(pathname)}
        </h1>
        <p className="truncate text-xs text-muted">
          {activeMerchant.merchant.name}
        </p>
      </div>
      <MerchantSwitcher
        activeMerchant={activeMerchant}
        merchants={profile.merchants}
      />
      <RealtimeStatusIndicator />
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <NotificationMenu />
        <UserProfileMenu activeMerchant={activeMerchant} user={profile.user} />
      </div>
    </header>
  );
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/products")) return "Products";
  if (pathname.startsWith("/dashboard/inventory")) return "Inventory";
  if (pathname.startsWith("/dashboard/orders")) return "Orders";
  if (pathname.startsWith("/dashboard/payments")) return "Payments";
  if (pathname.startsWith("/dashboard/social-posts")) return "Social commerce";
  if (pathname.startsWith("/dashboard/storefront")) return "Storefront";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";

  return "Overview";
}
