import { posApiSuccess } from "@/lib/pos/api-response";
import { clearPosSessionCookies } from "@/lib/pos/session-server";

export async function POST(request: Request) {
  const response = posApiSuccess(request, { ok: true });
  clearPosSessionCookies(response);
  return response;
}
