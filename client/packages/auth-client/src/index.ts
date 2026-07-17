import type { AuthUser, PermissionCode } from "@repo/types";
import { createApiClient } from "@repo/api-client";

export type LoginCredentials = {
  email?: string;
  password: string;
  phone?: string;
};

export type AuthSession = {
  user: AuthUser;
  expiresAt?: string;
};

export type AuthClientOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export type RouteGuardResult =
  | { allowed: true; redirectTo?: never }
  | { allowed: false; redirectTo: string };

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: PermissionCode,
) {
  return Boolean(user?.permissions.includes(permission));
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: PermissionCode[],
) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasRole(user: AuthUser | null | undefined, role: string) {
  return Boolean(user?.roles.includes(role));
}

export async function getCurrentUser(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/auth/me", {
    credentials: "include",
  });

  if (!response.ok) return null;

  return (await response.json()) as AuthUser;
}

export async function login(
  credentials: LoginCredentials,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher("/auth/login", {
    body: JSON.stringify(credentials),
    credentials: "include",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return (await response.json()) as AuthSession;
}

export async function logout(fetcher: typeof fetch = fetch) {
  await fetcher("/auth/logout", {
    credentials: "include",
    method: "POST",
  });
}

export async function refreshSession(fetcher: typeof fetch = fetch) {
  const response = await fetcher("/auth/refresh", {
    credentials: "include",
    method: "POST",
  });

  if (!response.ok) return null;

  return (await response.json()) as AuthSession;
}

export function createAuthClient(options: AuthClientOptions = {}) {
  const api = options.baseUrl
    ? createApiClient({ baseUrl: options.baseUrl })
    : null;
  const fetcher = options.fetcher ?? fetch;

  return {
    getCurrentUser: () =>
      api ? api.get<AuthUser>("/auth/me") : getCurrentUser(fetcher),
    login: (credentials: LoginCredentials) =>
      api
        ? api.post<AuthSession, LoginCredentials>("/auth/login", credentials)
        : login(credentials, fetcher),
    logout: () => (api ? api.post<void, undefined>("/auth/logout", undefined) : logout(fetcher)),
    refreshSession: () =>
      api ? api.post<AuthSession, undefined>("/auth/refresh", undefined) : refreshSession(fetcher),
  };
}

export function requireAuthenticated(
  user: AuthUser | null | undefined,
  loginPath = "/auth/login",
): RouteGuardResult {
  return user ? { allowed: true } : { allowed: false, redirectTo: loginPath };
}

export function requirePermission(
  user: AuthUser | null | undefined,
  permission: PermissionCode,
  deniedPath = "/403",
  loginPath = "/auth/login",
): RouteGuardResult {
  const authResult = requireAuthenticated(user, loginPath);

  if (!authResult.allowed) return authResult;

  return hasPermission(user, permission)
    ? { allowed: true }
    : { allowed: false, redirectTo: deniedPath };
}

export function requireAnyPermission(
  user: AuthUser | null | undefined,
  permissions: PermissionCode[],
  deniedPath = "/403",
  loginPath = "/auth/login",
): RouteGuardResult {
  const authResult = requireAuthenticated(user, loginPath);

  if (!authResult.allowed) return authResult;

  return hasAnyPermission(user, permissions)
    ? { allowed: true }
    : { allowed: false, redirectTo: deniedPath };
}
