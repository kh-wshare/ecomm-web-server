"use client";

import { DashboardLoading } from "./dashboard-loading";
import { DashboardSidebar } from "./dashboard-sidebar";
import { MobileNavigation } from "./mobile-navigation";
import { TopNavigation } from "./top-navigation";

import { useAuthSession } from "@/hooks/use-auth-session";
import { useUiStore } from "@/stores/ui-store";

export function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { activeMerchant, isChecking, profile } = useAuthSession();
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed);

  if (isChecking || !profile || !activeMerchant) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <DashboardSidebar permissions={activeMerchant.permissions} />
      <MobileNavigation permissions={activeMerchant.permissions} />
      <div
        className={`min-h-dvh transition-[padding] duration-200 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <TopNavigation activeMerchant={activeMerchant} profile={profile} />
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
