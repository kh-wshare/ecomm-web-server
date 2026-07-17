import type { AuthUser, ID, PermissionCode } from "@repo/types";

export type MerchantSummary = {
  id: ID;
  name: string;
  slug?: string;
};

export type MerchantAccess = {
  merchant: MerchantSummary;
  permissions: PermissionCode[];
  role: string;
};

export type CurrentProfile = {
  activeMerchant: MerchantAccess | null;
  merchants: MerchantAccess[];
  user: AuthUser;
};
