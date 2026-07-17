import { NextResponse } from "next/server";

import {
  getInternalApiUrl,
  missingInternalApiResponse,
} from "@/lib/api/server";

export async function POST(request: Request) {
  const accessToken = cookieValue(request.headers.get("cookie"), "access_token");
  if (!accessToken) {
    return NextResponse.json(
      { message: "Missing merchant session", statusCode: 401 },
      { status: 401 },
    );
  }

  const apiBaseUrl = getInternalApiUrl();
  if (!apiBaseUrl) return missingInternalApiResponse();

  const response = await fetch(
    new URL("/files/upload", apiBaseUrl),
    {
      body: await request.formData(),
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      method: "POST",
    },
  );
  const payload = await response.json().catch(() => ({
    message: response.statusText,
    statusCode: response.status,
  }));

  return NextResponse.json(payload, { status: response.status });
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
