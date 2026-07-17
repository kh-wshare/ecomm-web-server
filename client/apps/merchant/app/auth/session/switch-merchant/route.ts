import { NextResponse } from "next/server";

import { setMerchantAccessCookies } from "@/lib/auth/cookies";
import {
  type MerchantCurrentProfile,
  normalizeMerchantSession,
  type SwitchMerchantResult,
} from "@/lib/auth/session";
import { requestAuthApi } from "@/lib/auth/server";

export async function POST(request: Request) {
  const accessToken = cookieValue(request.headers.get("cookie"), "access_token");
  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing merchant session", statusCode: 401 },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    merchantId?: unknown;
  } | null;
  if (typeof body?.merchantId !== "string" || !body.merchantId) {
    return NextResponse.json(
      { message: "Merchant ID is required", statusCode: 400 },
      { status: 400 },
    );
  }

  const switched = await requestAuthApi<SwitchMerchantResult>(
    "/auth/switch-merchant",
    {
      accessToken,
      body: { merchantId: body.merchantId },
    },
  );
  if (switched instanceof NextResponse) return switched;

  const profile = await requestAuthApi<MerchantCurrentProfile>("/auth/me", {
    accessToken: switched.accessToken,
    method: "GET",
  });
  if (profile instanceof NextResponse) return profile;

  const response = NextResponse.json(
    normalizeMerchantSession({
      ...profile,
      activeMerchant: switched.activeMerchant,
    }),
  );
  setMerchantAccessCookies(
    response,
    switched.accessToken,
    switched.activeMerchant,
  );

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
