"use client";

import { create } from "zustand";

type UiState = {
  isMobileNavigationOpen: boolean;
  isSidebarCollapsed: boolean;
  closeMobileNavigation: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileNavigation: () => void;
};

export const useUiStore = create<UiState>()((set) => ({
  isMobileNavigationOpen: false,
  isSidebarCollapsed: false,
  closeMobileNavigation: () => set({ isMobileNavigationOpen: false }),
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
  toggleMobileNavigation: () =>
    set((state) => ({
      isMobileNavigationOpen: !state.isMobileNavigationOpen,
    })),
}));
