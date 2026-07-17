"use client";

import { useEffect } from "react";

import { DashboardIcon } from "./icon";
import { SidebarContent } from "./dashboard-sidebar";

import { Button } from "@/components/ui/hero-controls";
import { useUiStore } from "@/stores/ui-store";

export function MobileNavigation({ permissions }: { permissions: string[] }) {
  const isOpen = useUiStore((state) => state.isMobileNavigationOpen);
  const close = useUiStore((state) => state.closeMobileNavigation);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <Button
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        type="button"
        onClick={close}
      />
      <aside className="relative flex h-full w-[min(19rem,86vw)] flex-col border-r border-separator bg-surface shadow-2xl">
        <Button
          aria-label="Close navigation"
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-secondary hover:text-foreground"
          type="button"
          onClick={close}
        >
          <DashboardIcon name="close" />
        </Button>
        <SidebarContent onNavigate={close} permissions={permissions} />
      </aside>
    </div>
  );
}
