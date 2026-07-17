import { NextResponse } from "next/server";

import { setMerchantSessionCookies } from "@/lib/auth/cookies";
import {
  type MerchantAuthSession,
  normalizeMerchantSession,
} from "@/lib/auth/session";
import { requestAuthApi } from "@/lib/auth/server";

const providerPaths = {
  "firebase-google": "/auth/login/firebase-google",
  telegram: "/auth/login/telegram",
} as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const path = providerPaths[provider as keyof typeof providerPaths];

  if (!path) {
    return NextResponse.json(
      { message: "Unsupported social login provider", statusCode: 404 },
      { status: 404 },
    );
  }

  const session = await requestAuthApi<MerchantAuthSession>(path, {
    body: await request.json(),
  });

  if (session instanceof NextResponse) return session;

  const response = NextResponse.json(normalizeMerchantSession(session));
  setMerchantSessionCookies(response, session);
  return response;
}
