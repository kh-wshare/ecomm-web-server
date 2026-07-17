import { posApiError, posApiSuccess } from "@/lib/pos/api-response";
import {
  readPosSession,
  setPosSessionCookies,
  withBranch,
} from "@/lib/pos/session-server";
import type { PosBranch } from "@/types/pos";

export async function POST(request: Request) {
  const session = readPosSession(request);

  if (!session) {
    return posApiError(request, {
      message: "Missing POS session",
      statusCode: 401,
    });
  }

  const { branch } = (await request.json()) as { branch?: PosBranch };

  if (!branch?.id) {
    return posApiError(request, {
      message: "Select a valid POS branch",
      statusCode: 400,
    });
  }

  const nextSession = withBranch(session, branch);
  const response = posApiSuccess(request, nextSession);
  setPosSessionCookies(response, nextSession);

  return response;
}
