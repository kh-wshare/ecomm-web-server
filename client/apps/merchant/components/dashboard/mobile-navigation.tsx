"use client";

import { Button } from "@repo/ui";

import { SidebarContent } from "./dashboard-sidebar";

import { useUiStore } from "@/stores/ui-store";

export function MobileNavigation() {
  const isOpen = useUiStore((state) => state.isMobileNavigationOpen);
  const close = useUiStore((state) => state.closeMobileNavigation);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/35"
        type="button"
        onClick={close}
      />
      <aside className="absolute inset-y-0 left-0 w-72 border-r border-separator bg-surface shadow-none">
        <div className="flex justify-end p-3">
          <Button size="sm" variant="tertiary" onPress={close}>
            Close
          </Button>
        </div>
        <SidebarContent onNavigate={close} />
      </aside>
    </div>
  );
}
