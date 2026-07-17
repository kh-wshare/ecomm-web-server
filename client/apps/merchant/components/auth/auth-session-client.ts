import type { NormalizedMerchantSession } from "@/lib/auth/session";
import { unwrapApiResponseData } from "@repo/api-client";

export async function postAuthSession<TBody>(path: string, body: TBody) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessage(payload, response.status));
  }

  return unwrapApiResponseData<NormalizedMerchantSession>(payload);
}

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const body = payload as { error?: unknown; message?: unknown };
    if (typeof body.message === "string") return body.message;
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (typeof body.error === "string") return body.error;
  }

  return status === 401
    ? "Invalid credentials"
    : "Unable to complete the request.";
}
