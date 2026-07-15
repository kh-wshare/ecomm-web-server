import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { readPosAccessToken, readPosSession } from "@/lib/pos/session-server";

const allowedPrefixes = new Set(["orders", "products"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = readPosSession(request);
  const accessToken = readPosAccessToken(request);

  if (!session || !accessToken) {
    return NextResponse.json(
      { message: "Missing POS session", statusCode: 401 },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  if (!path.length || !allowedPrefixes.has(path[0] ?? "")) {
    return NextResponse.json(
      { message: "Unsupported POS resource", statusCode: 404 },
      { status: 404 },
    );
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
  const payload = await response.json().catch(() => ({
    message: response.statusText,
    statusCode: response.status,
  }));

  return NextResponse.json(payload, { status: response.status });
}
