import { NextResponse } from "next/server";

import { setMerchantSessionCookies } from "@/lib/auth/cookies";
import {
  type MerchantAuthSession,
  normalizeMerchantSession,
} from "@/lib/auth/session";
import { requestAuthApi } from "@/lib/auth/server";

export async function POST(request: Request) {
  const session = await requestAuthApi<MerchantAuthSession>(
    "/auth/register-merchant",
    {
      body: await request.json(),
    },
  );

  if (session instanceof NextResponse) return session;

  const response = NextResponse.json(normalizeMerchantSession(session));
  setMerchantSessionCookies(response, session);
  return response;
}
