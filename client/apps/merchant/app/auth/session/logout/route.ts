import { NextResponse } from "next/server";

import { clearMerchantSessionCookies } from "@/lib/auth/cookies";
import { requestAuthApi } from "@/lib/auth/server";

export async function POST(request: Request) {
  const accessToken = cookieValue(request.headers.get("cookie"), "access_token");

  if (accessToken) {
    await requestAuthApi("/auth/logout", { accessToken });
  }

  const response = NextResponse.json({ success: true });
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
