import { MERCHANT_BASE_PATH } from "./session";

export function merchantRedirectTarget(next: string | null) {
  if (!next || next.startsWith("//")) return `${MERCHANT_BASE_PATH}/dashboard`;
  if (next.startsWith(`${MERCHANT_BASE_PATH}/`)) return next;
  if (next.startsWith("/")) return `${MERCHANT_BASE_PATH}${next}`;

  return `${MERCHANT_BASE_PATH}/dashboard`;
}
