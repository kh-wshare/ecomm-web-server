import { NextResponse } from "next/server";

import {
  type MerchantCurrentProfile,
  normalizeMerchantSession,
} from "@/lib/auth/session";
import { requestAuthApi } from "@/lib/auth/server";

export async function GET(request: Request) {
  const accessToken = cookieValue(request.headers.get("cookie"), "access_token");

  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing merchant session", statusCode: 401 },
      { status: 401 },
    );
  }

  const profile = await requestAuthApi<MerchantCurrentProfile>("/auth/me", {
    accessToken,
    method: "GET",
  });

  if (profile instanceof NextResponse) return profile;

  return NextResponse.json(normalizeMerchantSession(profile));
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
