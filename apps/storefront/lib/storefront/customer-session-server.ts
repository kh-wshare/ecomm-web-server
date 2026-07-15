import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { NextResponse } from "next/server";

import type { AuthResult, CustomerSession } from "@/types/auth";

export const CUSTOMER_ACCESS_COOKIE = "customer_access_token";
export const CUSTOMER_REFRESH_COOKIE = "customer_refresh_token";
export const CUSTOMER_SESSION_COOKIE = "customer_session";

const isProduction = process.env.NODE_ENV === "production";
const cookieBase = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: isProduction,
} satisfies Partial<ResponseCookie>;

export function normalizeCustomerSession(auth: AuthResult): CustomerSession {
  return { user: auth.user };
}

export function setCustomerSessionCookies(
  response: NextResponse,
  auth: AuthResult,
) {
  const session = normalizeCustomerSession(auth);

  response.cookies.set(CUSTOMER_SESSION_COOKIE, encodeSession(session), {
    ...cookieBase,
    maxAge: jwtMaxAge(auth.accessToken) ?? 60 * 15,
  });
  response.cookies.set(CUSTOMER_ACCESS_COOKIE, auth.accessToken, {
    ...cookieBase,
    maxAge: jwtMaxAge(auth.accessToken) ?? 60 * 15,
  });
  response.cookies.set(CUSTOMER_REFRESH_COOKIE, auth.refreshToken, {
    ...cookieBase,
    maxAge: jwtMaxAge(auth.refreshToken) ?? 60 * 60 * 24 * 30,
  });
}

export function clearCustomerSessionCookies(response: NextResponse) {
  for (const name of [
    CUSTOMER_ACCESS_COOKIE,
    CUSTOMER_REFRESH_COOKIE,
    CUSTOMER_SESSION_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      ...cookieBase,
      maxAge: 0,
    });
  }
}

export function readCustomerSession(request: Request) {
  const raw = cookieValue(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE);
  if (!raw) return null;

  try {
    return JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as CustomerSession;
  } catch {
    return null;
  }
}

function encodeSession(session: CustomerSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function jwtMaxAge(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(base64UrlToBase64(payload), "base64").toString("utf8"),
    ) as { exp?: unknown };
    if (typeof parsed.exp !== "number") return null;

    return Math.max(0, parsed.exp - Math.floor(Date.now() / 1000));
  } catch {
    return null;
  }
}

function base64UrlToBase64(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
}
