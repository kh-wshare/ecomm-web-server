import type { AuthUser, PermissionCode } from "@repo/types";

import type { MerchantAccess } from "@/types/auth";

export const MERCHANT_BASE_PATH = "/merchant";
export const SESSION_ME_PATH = `${MERCHANT_BASE_PATH}/auth/session/me`;
export const SESSION_LOGIN_PATH = `${MERCHANT_BASE_PATH}/auth/session/login`;
export const SESSION_LOGOUT_PATH = `${MERCHANT_BASE_PATH}/auth/session/logout`;
export const SESSION_REALTIME_TOKEN_PATH = `${MERCHANT_BASE_PATH}/auth/session/realtime-token`;
export const SESSION_REGISTER_PATH = `${MERCHANT_BASE_PATH}/auth/session/register`;
export const SESSION_SWITCH_MERCHANT_PATH = `${MERCHANT_BASE_PATH}/auth/session/switch-merchant`;

export type MerchantAuthSession = {
  accessToken: string;
  refreshToken: string;
  activeMerchant?: MerchantAccess | null;
  merchants?: MerchantAccess[];
  user: {
    email: string;
    fullName: string;
    id: string;
    phone?: null | string;
    platformRole?: string;
    status?: string;
  };
};

export type MerchantCurrentProfile = {
  activeMerchant?: MerchantAccess | null;
  merchants?: MerchantAccess[];
  user: MerchantAuthSession["user"];
};

export type SwitchMerchantResult = {
  accessToken: string;
  activeMerchant: MerchantAccess;
};

export type NormalizedMerchantSession = {
  activeMerchant: MerchantAccess | null;
  merchants: MerchantAccess[];
  user: AuthUser;
};

export function normalizeMerchantSession(
  session: MerchantAuthSession | MerchantCurrentProfile,
): NormalizedMerchantSession {
  const merchants = Array.isArray(session.merchants)
    ? session.merchants.map(normalizeMerchantAccess)
    : [];
  const activeMerchant =
    "activeMerchant" in session ? session.activeMerchant : undefined;
  const normalizedActiveMerchant = activeMerchant
    ? normalizeMerchantAccess(activeMerchant)
    : (merchants[0] ?? null);

  return {
    activeMerchant: normalizedActiveMerchant,
    merchants,
    user: normalizeMerchantUser(session.user, normalizedActiveMerchant),
  };
}

export function normalizeMerchantUser(
  user: MerchantAuthSession["user"],
  activeMerchant: MerchantAccess | null,
): AuthUser {
  return {
    branchIds: [],
    email: user.email,
    fullName: user.fullName,
    id: user.id,
    merchantId: activeMerchant?.merchant.id,
    permissions: activeMerchant?.permissions ?? ([] as PermissionCode[]),
    phone: user.phone ?? undefined,
    roles: activeMerchant?.role ? [activeMerchant.role] : [],
  };
}

export function normalizeMerchantAccess(access: MerchantAccess): MerchantAccess {
  return {
    ...access,
    permissions: normalizePermissions(access.permissions),
  };
}

function normalizePermissions(permissions: readonly string[]) {
  const normalized = new Set<PermissionCode>();

  permissions.forEach((permission) => {
    switch (permission) {
      case "dashboard.read":
        normalized.add("merchant.dashboard.read");
        break;
      case "inventory.adjust":
        normalized.add("inventory.update");
        break;
      case "merchant.read":
      case "merchant.update":
      case "theme.read":
      case "theme.update":
      case "theme.publish":
        normalized.add("storefront.manage");
        break;
      case "order.read":
        normalized.add("orders.read");
        break;
      case "order.cancel":
      case "order.refund":
      case "order.update":
        normalized.add("orders.update");
        break;
      case "payment.provider_manage":
      case "payment.read":
        normalized.add("payments.manage");
        break;
      case "product.create":
        normalized.add("products.create");
        break;
      case "product.delete":
        normalized.add("products.delete");
        break;
      case "product.read":
        normalized.add("products.read");
        break;
      case "product.update":
        normalized.add("products.update");
        break;
      case "social_post.create":
      case "social_post.publish":
      case "social_post.read":
      case "social_post.update":
        normalized.add("social.manage");
        break;
      default:
        if (isSharedPermission(permission)) normalized.add(permission);
    }
  });

  return [...normalized];
}

function isSharedPermission(permission: string): permission is PermissionCode {
  return [
    "merchant.dashboard.read",
    "products.read",
    "products.create",
    "products.update",
    "products.delete",
    "inventory.read",
    "inventory.update",
    "orders.read",
    "orders.update",
    "payments.manage",
    "storefront.manage",
    "social.manage",
    "pos.access",
    "pos.sale.create",
  ].includes(permission);
}
