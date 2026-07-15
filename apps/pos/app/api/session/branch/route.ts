import { NextResponse } from "next/server";

import {
  readPosSession,
  setPosSessionCookies,
  withBranch,
} from "@/lib/pos/session-server";
import type { PosBranch } from "@/types/pos";

export async function POST(request: Request) {
  const session = readPosSession(request);

  if (!session) {
    return NextResponse.json(
      { message: "Missing POS session", statusCode: 401 },
      { status: 401 },
    );
  }

  const { branch } = (await request.json()) as { branch?: PosBranch };

  if (!branch?.id) {
    return NextResponse.json(
      { message: "Select a valid POS branch", statusCode: 400 },
      { status: 400 },
    );
  }

  const nextSession = withBranch(session, branch);
  const response = NextResponse.json(nextSession);
  setPosSessionCookies(response, nextSession);

  return response;
}
