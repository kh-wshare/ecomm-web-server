import type { CustomerSession } from "@/types/auth";
import { unwrapApiResponseData } from "@repo/api-client";

const CUSTOMER_SESSION_BASE_PATH = "/auth/customer/session";

export async function getCustomerSession() {
  const response = await fetch(`${CUSTOMER_SESSION_BASE_PATH}/me`, {
    credentials: "include",
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(await responseMessage(response, "Unable to restore session."));
  }

  return unwrapApiResponseData<CustomerSession>(await response.json());
}

export async function loginCustomerSession({
  idToken,
  provider,
}: {
  idToken: string;
  provider: "firebase-google" | "telegram";
}) {
  const response = await fetch(`${CUSTOMER_SESSION_BASE_PATH}/${provider}`, {
    body: JSON.stringify({ idToken }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response, "Unable to sign in."));
  }

  return unwrapApiResponseData<CustomerSession>(await response.json());
}

export async function logoutCustomerSession() {
  await fetch(`${CUSTOMER_SESSION_BASE_PATH}/logout`, {
    credentials: "include",
    method: "POST",
  });
}

async function responseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return typeof payload?.message === "string" ? payload.message : fallback;
}
