import { MERCHANT_BASE_PATH } from "./session";

const DEFAULT_MERCHANT_REDIRECT = "/dashboard";

export function merchantRedirectTarget(next: string | null) {
  if (!next || next.startsWith("//")) return DEFAULT_MERCHANT_REDIRECT;

  const normalizedNext = stripMerchantBasePath(next);

  if (normalizedNext === MERCHANT_BASE_PATH) return DEFAULT_MERCHANT_REDIRECT;
  if (normalizedNext.startsWith("/")) return normalizedNext;

  return DEFAULT_MERCHANT_REDIRECT;
}

function stripMerchantBasePath(value: string) {
  let target = value;

  while (
    target === MERCHANT_BASE_PATH ||
    target.startsWith(`${MERCHANT_BASE_PATH}/`) ||
    target.startsWith(`${MERCHANT_BASE_PATH}?`)
  ) {
    target = target.slice(MERCHANT_BASE_PATH.length) || DEFAULT_MERCHANT_REDIRECT;
  }

  return target;
}
