import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { AuthUser } from "@repo/types";

import { demoBranches } from "@/lib/pos/mock-data";
import type { PosBranch, PosSession } from "@/types/pos";

export const POS_ACCESS_COOKIE = "pos_access_token";
export const POS_REFRESH_COOKIE = "pos_refresh_token";
export const POS_SESSION_COOKIE = "pos_session";

const isProduction = process.env.NODE_ENV === "production";
const cookieBase = {
  httpOnly: true,
  path: "/pos",
  sameSite: "lax",
  secure: isProduction,
} satisfies Partial<ResponseCookie>;

export type PosAuthPayload = {
  accessToken?: string;
  refreshToken?: string;
  activeMerchant?: {
    merchant?: {
      id: string;
      name: string;
      slug?: string;
    };
  } | null;
  merchants?: Array<{
    merchant: {
      id: string;
      name: string;
      slug?: string;
    };
  }>;
  user: AuthUser;
};

export function normalizePosSession(auth: PosAuthPayload): PosSession {
  const merchantAccess = auth.activeMerchant ?? auth.merchants?.[0] ?? null;

  return {
    activeBranch: demoBranches[0],
    merchant: {
      id: merchantAccess?.merchant?.id ?? "demo-merchant",
      name: merchantAccess?.merchant?.name ?? "Demo Merchant",
      slug: merchantAccess?.merchant?.slug ?? "demo-merchant",
    },
    user: auth.user,
  };
}

export function setPosSessionCookies(
  response: NextResponse,
  session: PosSession,
  tokens?: { accessToken?: string; refreshToken?: string },
) {
  response.cookies.set(POS_SESSION_COOKIE, encodeSession(session), {
    ...cookieBase,
    maxAge: tokens?.accessToken ? jwtMaxAge(tokens.accessToken) ?? 60 * 15 : 60 * 60 * 8,
  });

  if (tokens?.accessToken) {
    response.cookies.set(POS_ACCESS_COOKIE, tokens.accessToken, {
      ...cookieBase,
      maxAge: jwtMaxAge(tokens.accessToken) ?? 60 * 15,
    });
  }

  if (tokens?.refreshToken) {
    response.cookies.set(POS_REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieBase,
      maxAge: jwtMaxAge(tokens.refreshToken) ?? 60 * 60 * 24 * 30,
    });
  }
}

export function clearPosSessionCookies(response: NextResponse) {
  for (const name of [POS_ACCESS_COOKIE, POS_REFRESH_COOKIE, POS_SESSION_COOKIE]) {
    response.cookies.set(name, "", {
      ...cookieBase,
      maxAge: 0,
    });
  }
}

export function readPosSession(request: NextRequest | Request) {
  const cookieHeader =
    "cookies" in request
      ? request.cookies.get(POS_SESSION_COOKIE)?.value
      : cookieValue(request.headers.get("cookie"), POS_SESSION_COOKIE);

  if (!cookieHeader) return null;
  return decodeSession(cookieHeader);
}

export function readPosAccessToken(request: Request) {
  return cookieValue(request.headers.get("cookie"), POS_ACCESS_COOKIE);
}

export function withBranch(session: PosSession, branch: PosBranch): PosSession {
  return { ...session, activeBranch: branch };
}

function encodeSession(session: PosSession) {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeSession(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PosSession;
  } catch {
    return null;
  }
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
