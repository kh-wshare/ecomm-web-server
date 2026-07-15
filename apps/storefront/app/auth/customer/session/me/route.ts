import { NextResponse } from "next/server";

import { readCustomerSession } from "@/lib/storefront/customer-session-server";

export async function GET(request: Request) {
  const session = readCustomerSession(request);

  if (!session) {
    return NextResponse.json(
      { message: "Missing customer session", statusCode: 401 },
      { status: 401 },
    );
  }

  return NextResponse.json(session);
}
