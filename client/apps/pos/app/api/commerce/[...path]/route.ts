import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { parseApiPayload, posApiError } from "@/lib/pos/api-response";
import { readPosAccessToken, readPosSession } from "@/lib/pos/session-server";

const allowedPrefixes = new Set(["branches", "orders", "products"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = readPosSession(request);
  const accessToken = readPosAccessToken(request);

  if (!session || !accessToken) {
    return posApiError(request, {
      message: "Missing POS session",
      statusCode: 401,
    });
  }

  const { path } = await context.params;
  if (!path.length || !allowedPrefixes.has(path[0] ?? "")) {
    return posApiError(request, {
      message: "Unsupported POS resource",
      statusCode: 404,
    });
  }

  const targetUrl = new URL(
    `/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
    env.INTERNAL_API_URL ?? env.NEXT_PUBLIC_API_URL,
  );
  const response = await fetch(targetUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Merchant-ID": session.merchant.id,
    },
  });
  const payload = await parseApiPayload(response);

  return NextResponse.json(payload, { status: response.status });
}
