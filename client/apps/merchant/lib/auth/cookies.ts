import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { NextResponse } from "next/server";

import type { MerchantAccess } from "@/types/auth";

import type { MerchantAuthSession } from "./session";

const isProduction = process.env.NODE_ENV === "production";
const cookieBase = {
  httpOnly: true,
  path: "/merchant",
  sameSite: "lax",
  secure: isProduction,
} satisfies Partial<ResponseCookie>;

export function setMerchantSessionCookies(
  response: NextResponse,
  session: MerchantAuthSession,
) {
  response.cookies.set("access_token", session.accessToken, {
    ...cookieBase,
    maxAge: jwtMaxAge(session.accessToken) ?? 60 * 15,
  });
  response.cookies.set("refresh_token", session.refreshToken, {
    ...cookieBase,
    maxAge: jwtMaxAge(session.refreshToken) ?? 60 * 60 * 24 * 30,
  });
  response.cookies.set(
    "merchant_session",
    session.activeMerchant?.merchant.id ?? "none",
    {
      ...cookieBase,
      maxAge: jwtMaxAge(session.accessToken) ?? 60 * 15,
    },
  );
}

export function setMerchantAccessCookies(
  response: NextResponse,
  accessToken: string,
  activeMerchant: MerchantAccess,
) {
  response.cookies.set("access_token", accessToken, {
    ...cookieBase,
    maxAge: jwtMaxAge(accessToken) ?? 60 * 15,
  });
  response.cookies.set("merchant_session", activeMerchant.merchant.id, {
    ...cookieBase,
    maxAge: jwtMaxAge(accessToken) ?? 60 * 15,
  });
}

export function clearMerchantSessionCookies(response: NextResponse) {
  for (const name of ["access_token", "refresh_token", "merchant_session"]) {
    response.cookies.set(name, "", {
      ...cookieBase,
      maxAge: 0,
    });
  }
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
