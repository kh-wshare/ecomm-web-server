import { unwrapApiResponseData } from "@repo/api-client";

import { env } from "@/lib/env";
import {
  parseApiPayload,
  posApiError,
  posApiSuccess,
  proxyApiError,
} from "@/lib/pos/api-response";
import {
  type PosAuthPayload,
  normalizePosSession,
  setPosSessionCookies,
} from "@/lib/pos/session-server";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    email?: unknown;
    password?: unknown;
  };
  if (typeof payload.email !== "string" || typeof payload.password !== "string") {
    return posApiError(request, {
      message: "Email and password are required",
      statusCode: 400,
    });
  }

  const apiBaseUrl = env.INTERNAL_API_URL ?? env.NEXT_PUBLIC_API_URL;
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  }).catch(() => null);

  if (!response) {
    return posApiError(request, {
      message: "Unable to connect to backend API",
      statusCode: 502,
    });
  }

  const responsePayload = await parseApiPayload(response);

  if (!response.ok) {
    return proxyApiError(responsePayload, request, response.status);
  }

  const auth = unwrapApiResponseData<PosAuthPayload>(responsePayload);
  const merchantAccess = auth.activeMerchant ?? auth.merchants?.[0] ?? null;
  if (!merchantAccess) {
    return posApiError(request, {
      message: "No active merchant access for POS",
      statusCode: 403,
    });
  }

  const session = normalizePosSession(auth);
  if (!session.user.permissions.includes("pos.access")) {
    return posApiError(request, {
      message: "Missing POS access permission",
      statusCode: 403,
    });
  }

  const result = posApiSuccess(request, session);
  setPosSessionCookies(result, session, {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
  });

  return result;
}
