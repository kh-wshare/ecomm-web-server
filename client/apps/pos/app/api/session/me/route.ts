import { posApiError, posApiSuccess } from "@/lib/pos/api-response";
import { readPosSession } from "@/lib/pos/session-server";

export async function GET(request: Request) {
  const session = readPosSession(request);

  if (!session) {
    return posApiError(request, {
      message: "Missing POS session",
      statusCode: 401,
    });
  }

  return posApiSuccess(request, session);
}
