import type { AuthUser, ID, PermissionCode } from "@repo/types";

export type MerchantSummary = {
  id: ID;
  name: string;
  slug?: string;
};

export type MerchantAccess = {
  merchant: MerchantSummary;
  permissions: PermissionCode[];
  roles: string[];
};

export type CurrentProfile = {
  merchants: MerchantAccess[];
  user: AuthUser;
};
