import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createDemoSession } from "@/lib/pos/pos-data";
import {
  type PosAuthPayload,
  normalizePosSession,
  setPosSessionCookies,
} from "@/lib/pos/session-server";

export async function POST(request: Request) {
  const payload = await request.json();
  const apiBaseUrl = env.INTERNAL_API_URL ?? env.NEXT_PUBLIC_API_URL;
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const session = createDemoSession(payload.email || payload.phone || "staff");
    const fallback = NextResponse.json(session);
    setPosSessionCookies(fallback, session);
    return fallback;
  }

  const auth = (await response.json()) as PosAuthPayload;
  const session = normalizePosSession(auth);
  const result = NextResponse.json(session);
  setPosSessionCookies(result, session, {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
  });

  return result;
}
