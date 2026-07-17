import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export function getInternalApiUrl() {
  return env.INTERNAL_API_URL ?? null;
}

export function missingInternalApiResponse() {
  return NextResponse.json(
    {
      message:
        "Missing INTERNAL_API_URL. Set it to the Nest API origin for merchant server routes.",
      statusCode: 500,
    },
    { status: 500 },
  );
}
