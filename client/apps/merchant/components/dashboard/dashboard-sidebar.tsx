"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@repo/ui";

import { DashboardIcon, type DashboardIconName } from "./dashboard-icon";

import { useUiStore } from "@/stores/ui-store";

type NavigationItem = {
  href: string;
  icon: DashboardIconName;
  label: string;
};

type NavigationGroup = {
  items: NavigationItem[];
  label: string;
};

export const merchantNavigation: NavigationGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", icon: "grid", label: "Overview" },
      { href: "/orders", icon: "orders", label: "Orders" },
      {
        href: "/payments/transactions",
        icon: "card",
        label: "Payments",
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/products", icon: "box", label: "Products" },
      { href: "/categories", icon: "tag", label: "Categories" },
      { href: "/inventory", icon: "inventory", label: "Inventory" },
    ],
  },
  {
    label: "Sales Channels",
    items: [
      { href: "/storefront/theme", icon: "globe", label: "Storefront" },
      { href: "/social-posts", icon: "share", label: "Social Posts" },
    ],
  },
  {
    label: "Business",
    items: [
      {
        href: "/settings/branches",
        icon: "location",
        label: "Locations",
      },
    ],
  },
];

export function DashboardSidebar() {
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const setCollapsed = useUiStore((state) => state.setSidebarCollapsed);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-separator bg-surface transition-[width] duration-200 lg:flex lg:flex-col ${isCollapsed ? "w-20" : "w-64"
        }`}
    >
      <SidebarContent collapsed={isCollapsed} />
      <Button
        isIconOnly
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="
          m-4 grid size-10 place-items-center self-end
          bg-primary/10 text-primary
          transition-colors
          hover:bg-primary/20 hover:text-primary
        "
        type="button"
        onPress={() => setCollapsed(!isCollapsed)}
      >
        <DashboardIcon
          className={`size-5 text-current transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""
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
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`flex h-16 items-center border-b border-separator ${collapsed ? "justify-center px-3" : "gap-3 px-5"
          }`}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-white">
          M
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Merchant Hub</p>
            <p className="truncate text-xs text-muted">
              Commerce dashboard
            </p>
          </div>
        )}
      </div>
      <nav
        aria-label="Merchant navigation"
        className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"
          }`}
      >
        <div className="space-y-5">
          {merchantNavigation.map((group, groupIndex) => (
            <div
              className={`space-y-1 ${collapsed && groupIndex > 0
                  ? "border-t border-separator pt-3"
                  : ""
                }`}
              key={group.label}
            >
              <p
                className={`px-3 text-[11px] font-bold uppercase text-muted ${collapsed ? "sr-only" : ""
                  }`}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === item.href || pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`group relative flex h-11 items-center rounded-lg text-sm font-medium transition ${collapsed ? "justify-center px-3" : "gap-3 px-3"
                        } ${isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted hover:bg-surface-secondary hover:text-foreground"
                        }`}
                      href={item.href}
                      key={item.href}
                      title={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                    >
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className={`absolute rounded-full bg-primary ${collapsed
                              ? "left-1 top-1/2 size-1.5 -translate-y-1/2"
                              : "left-0 top-2 bottom-2 w-1"
                            }`}
                        />
                      )}
                      <DashboardIcon
                        className="size-5 shrink-0"
                        name={item.icon}
                      />
                      <span className={collapsed ? "sr-only" : "truncate"}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
