import { NextResponse } from "next/server";

import { clearPosSessionCookies } from "@/lib/pos/session-server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearPosSessionCookies(response);
  return response;
}
