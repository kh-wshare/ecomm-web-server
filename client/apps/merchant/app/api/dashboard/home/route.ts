import { NextResponse } from "next/server";
import { ApiError, createServerApiClient } from "@repo/api-client";

import { getDashboardHomeData } from "@/lib/dashboard/home-data";
import { clearMerchantSessionCookies } from "@/lib/auth/cookies";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const accessToken = cookieValue(request.headers.get("cookie"), "access_token");

  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing merchant session", statusCode: 401 },
      { status: 401 },
    );
  }

  try {
    const data = await getDashboardHomeData(
      createServerApiClient({
        env,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      const response = NextResponse.json(
        { message: "Merchant session has expired", statusCode: 401 },
        { status: 401 },
      );
      clearMerchantSessionCookies(response);
      return response;
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Dashboard data is unavailable",
        statusCode: 502,
      },
      { status: 502 },
    );
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
