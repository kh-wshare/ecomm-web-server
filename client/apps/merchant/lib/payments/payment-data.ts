import type {
  Payment,
  PaymentFilters,
  PaymentPage,
  PaymentProvider,
  PaymentProviderCode,
} from "@repo/types";
import type { ApiResponse } from "@repo/types";

const commerceBasePath = "/merchant/api/commerce";

export async function getPaymentProviders() {
  const response = await commerceRequest<ApiResponse<PaymentProvider[]>>(
    "/payments/providers",
  );

  return response.data;
}

export async function connectPaymentProvider(payload: {
  provider: PaymentProviderCode;
  webhookSecret?: string;
  providerSecret?: string;
  config?: Record<string, unknown>;
}) {
  const response = await commerceRequest<ApiResponse<PaymentProvider>>(
    "/payments/providers",
    {
      body: payload,
      method: "POST",
    },
  );

  return response.data;
}

export async function disconnectPaymentProvider(provider: PaymentProviderCode) {
  const response = await commerceRequest<ApiResponse<PaymentProvider>>(
    `/payments/providers/${provider}/disconnect`,
    {
      method: "PATCH",
    },
  );

  return response.data;
}

export async function getPayments(
  filters: PaymentFilters,
): Promise<PaymentPage> {
  const response = await commerceRequest<ApiResponse<Payment[]>>(
    `/payments/transactions?${new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.provider !== "ALL" ? { provider: filters.provider } : {}),
      ...(filters.status !== "ALL" ? { status: filters.status } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    })}`,
  );

  return {
    items: response.data,
    meta: response.meta ?? {
      limit: filters.limit,
      page: filters.page,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: filters.page > 1,
    },
  };
}

export async function getPayment(paymentId: string) {
  const response = await commerceRequest<ApiResponse<Payment>>(
    `/payments/${paymentId}`,
  );

  return response.data;
}

async function commerceRequest<T>(
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  const response = await fetch(`${commerceBasePath}${path}`, {
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    method: options.method ?? "GET",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Payment request failed";

    throw new Error(message);
  }

  return payload as T;
}
