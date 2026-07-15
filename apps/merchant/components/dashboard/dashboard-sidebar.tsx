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

export const merchantNavigation: NavigationItem[] = [
  { href: "/dashboard", icon: "grid", label: "Overview" },
  { href: "/products", icon: "box", label: "Products" },
  { href: "/inventory", icon: "inventory", label: "Inventory" },
  { href: "/orders", icon: "orders", label: "Orders" },
  { href: "/payments/transactions", icon: "card", label: "Payments" },
  { href: "/social-posts", icon: "share", label: "Social" },
  { href: "/storefront/theme", icon: "globe", label: "Storefront" },
];

export function DashboardSidebar() {
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const setCollapsed = useUiStore((state) => state.setSidebarCollapsed);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex lg:flex-col dark:border-zinc-800 dark:bg-zinc-950 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <SidebarContent collapsed={isCollapsed} />
      <Button
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="m-4 grid size-10 place-items-center self-end rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-zinc-900 dark:hover:text-white"
        type="button"
        onPress={() => setCollapsed(!isCollapsed)}
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
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`flex h-16 items-center border-b border-slate-200 dark:border-zinc-800 ${
          collapsed ? "justify-center px-3" : "gap-3 px-5"
        }`}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-white">
          M
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Merchant Hub</p>
            <p className="truncate text-xs text-slate-500 dark:text-zinc-400">
              Commerce dashboard
            </p>
          </div>
        )}
      </div>
      <nav aria-label="Merchant navigation" className="flex-1 space-y-1 p-3">
        {merchantNavigation.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href || pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex h-11 items-center rounded-lg text-sm font-medium transition ${
                collapsed ? "justify-center px-3" : "gap-3 px-3"
              } ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
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
    </>
  );
}
