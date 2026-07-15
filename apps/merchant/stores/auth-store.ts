"use client";

import { create } from "zustand";

import type { AuthUser } from "@repo/types";

import type { MerchantAccess } from "@/types/auth";

type AuthState = {
  activeMerchant: MerchantAccess | null;
  isAuthenticated: boolean;
  merchants: MerchantAccess[];
  user: AuthUser | null;
  clear: () => void;
  setActiveMerchant: (merchant: MerchantAccess) => void;
  setSession: (session: {
    activeMerchant: MerchantAccess | null;
    merchants: MerchantAccess[];
    user: AuthUser;
  }) => void;
};

const initialState = {
  activeMerchant: null,
  isAuthenticated: false,
  merchants: [],
  user: null,
};

export const useAuthStore = create<AuthState>()((set) => ({
  ...initialState,
  clear: () => set(initialState),
  setActiveMerchant: (activeMerchant) => set({ activeMerchant }),
  setSession: ({ activeMerchant, merchants, user }) =>
    set({
      activeMerchant,
      isAuthenticated: true,
      merchants,
      user,
    }),
}));
