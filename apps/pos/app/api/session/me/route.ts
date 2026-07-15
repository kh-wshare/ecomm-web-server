import { NextResponse } from "next/server";

import { readPosSession } from "@/lib/pos/session-server";

export async function GET(request: Request) {
  const session = readPosSession(request);

  if (!session) {
    return NextResponse.json(
      { message: "Missing POS session", statusCode: 401 },
      { status: 401 },
    );
  }

  return NextResponse.json(session);
}
