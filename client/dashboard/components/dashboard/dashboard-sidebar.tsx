"use client";

import type { DashboardIconName } from "./icon";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardIcon } from "./icon";

import { Button } from "@/components/ui/hero-controls";
import { useUiStore } from "@/stores/ui-store";

type NavigationItem = {
  href: string;
  icon: DashboardIconName;
  label: string;
  permission?: string;
};

const primaryNavigation: NavigationItem[] = [
  {
    href: "/dashboard",
    icon: "grid",
    label: "Overview",
    permission: "dashboard.read",
  },
  {
    href: "/dashboard/products",
    icon: "box",
    label: "Products",
    permission: "product.read",
  },
  {
    href: "/dashboard/inventory",
    icon: "inventory",
    label: "Inventory",
    permission: "inventory.read",
  },
  {
    href: "/dashboard/orders",
    icon: "orders",
    label: "Orders",
    permission: "order.read",
  },
  {
    href: "/dashboard/payments/transactions",
    icon: "card",
    label: "Payments",
    permission: "payment.read",
  },
  {
    href: "/dashboard/social-posts",
    icon: "share",
    label: "Social",
    permission: "social_post.read",
  },
  {
    href: "/dashboard/storefront/theme",
    icon: "globe",
    label: "Storefront",
    permission: "theme.read",
  },
];

export function DashboardSidebar({ permissions }: { permissions: string[] }) {
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const setCollapsed = useUiStore((state) => state.setSidebarCollapsed);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-separator bg-surface transition-[width] duration-200 lg:flex lg:flex-col ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <SidebarContent collapsed={isCollapsed} permissions={permissions} />
      <Button
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="m-4 grid size-10 place-items-center self-end rounded-xl text-muted transition hover:bg-surface-secondary hover:text-foreground"
        type="button"
        onClick={() => setCollapsed(!isCollapsed)}
      >
        <DashboardIcon
          className={`size-5 transition-transform ${
            isCollapsed ? "rotate-180" : ""
          }`}
          name="collapse"
        />
      </Button>
    </aside>
  );
}

export function SidebarContent({
  collapsed = false,
  onNavigate,
  permissions,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  permissions: string[];
}) {
  const pathname = usePathname();
  const visibleItems = primaryNavigation.filter(
    ({ permission }) => !permission || permissions.includes(permission),
  );

  return (
    <>
      <div
        className={`flex h-16 items-center border-b border-separator ${
          collapsed ? "justify-center px-3" : "gap-3 px-5"
        }`}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-sm font-black text-accent-foreground">
          M
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Merchant Hub</p>
            <p className="truncate text-xs text-muted">Commerce dashboard</p>
          </div>
        )}
      </div>
      <nav
        aria-label="Dashboard navigation"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex h-11 items-center rounded-xl text-sm font-medium transition ${
                collapsed ? "justify-center px-3" : "gap-3 px-3"
              } ${
                isActive
                  ? "bg-accent/12 text-accent"
                  : "text-muted hover:bg-surface-secondary hover:text-foreground"
              }`}
              href={item.href}
              key={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
            >
              <DashboardIcon className="size-5 shrink-0" name={item.icon} />
              <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-separator p-3">
        <Link
          className={`flex h-11 items-center rounded-xl text-sm font-medium text-muted transition hover:bg-surface-secondary hover:text-foreground ${
            collapsed ? "justify-center px-3" : "gap-3 px-3"
          }`}
          href="/dashboard/settings"
          title={collapsed ? "Settings" : undefined}
          onClick={onNavigate}
        >
          <DashboardIcon className="size-5 shrink-0" name="settings" />
          <span className={collapsed ? "sr-only" : ""}>Settings</span>
        </Link>
      </div>
    </>
  );
}
