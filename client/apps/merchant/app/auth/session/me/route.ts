import { NextResponse } from "next/server";

import {
  type MerchantAuthSession,
  type MerchantCurrentProfile,
  normalizeMerchantSession,
} from "@/lib/auth/session";
import {
  clearMerchantSessionCookies,
  setMerchantSessionCookies,
} from "@/lib/auth/cookies";
import { requestAuthApi } from "@/lib/auth/server";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const accessToken = cookieValue(cookieHeader, "access_token");
  const refreshToken = cookieValue(cookieHeader, "refresh_token");

  if (!accessToken) {
    if (refreshToken) return refreshSession(refreshToken);

    return unauthorizedSession("Missing merchant session");
  }

  const profile = await requestAuthApi<MerchantCurrentProfile>("/auth/me", {
    accessToken,
    method: "GET",
  });

  if (profile instanceof NextResponse) {
    if (profile.status !== 401 || !refreshToken) {
      return unauthorizedSession("Merchant session has expired");
    }

    return refreshSession(refreshToken);
  }

  const merchantId = cookieValue(cookieHeader, "merchant_session");
  const activeMerchant =
    profile.activeMerchant ??
    profile.merchants?.find(
      ({ merchant }) => merchant.id === merchantId && merchantId !== "none",
    ) ??
    null;

  return NextResponse.json(
    normalizeMerchantSession({ ...profile, activeMerchant }),
  );
}

async function refreshSession(refreshToken: string) {
  const refreshed = await requestAuthApi<MerchantAuthSession>("/auth/refresh", {
    body: { refreshToken },
  });

  if (refreshed instanceof NextResponse) {
    return unauthorizedSession("Merchant session has expired");
  }

  const response = NextResponse.json(normalizeMerchantSession(refreshed));
  setMerchantSessionCookies(response, refreshed);
  return response;
}

function unauthorizedSession(message: string) {
  const response = NextResponse.json(
    { message, statusCode: 401 },
    { status: 401 },
  );
  clearMerchantSessionCookies(response);
  return response;
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
