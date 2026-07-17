import { NextResponse } from "next/server";

import { unwrapApiResponseData } from "@repo/api-client";

import { env } from "@/lib/env";
import {
  normalizeCustomerSession,
  setCustomerSessionCookies,
} from "@/lib/storefront/customer-session-server";
import type { AuthResult } from "@/types/auth";

const providerPaths = {
  "firebase-google": "/auth/customer/login/firebase-google",
  telegram: "/auth/customer/login/telegram",
} as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const path = providerPaths[provider as keyof typeof providerPaths];

  if (!path) {
    return NextResponse.json(
      { message: "Unsupported customer login provider", statusCode: 404 },
      { status: 404 },
    );
  }

  const apiBaseUrl = env.INTERNAL_API_URL ?? env.NEXT_PUBLIC_API_URL;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    body: JSON.stringify(await request.json()),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => ({
    message: response.statusText,
    statusCode: response.status,
  }));

  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  const auth = unwrapApiResponseData<AuthResult>(payload);
  const result = NextResponse.json(normalizeCustomerSession(auth));
  setCustomerSessionCookies(result, auth);

  return result;
}
