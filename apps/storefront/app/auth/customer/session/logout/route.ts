import { NextResponse } from "next/server";

import { clearCustomerSessionCookies } from "@/lib/storefront/customer-session-server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearCustomerSessionCookies(response);
  return response;
}
