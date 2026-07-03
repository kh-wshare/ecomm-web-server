import type {
  Payment,
  PaymentFilters,
  PaymentPage,
  PaymentProvider,
  PaymentProviderCode,
} from "@/types/payment";
import { apiClient } from "@/lib/api/client";

export async function getPaymentProviders() {
  const response = await apiClient.get<PaymentProvider[]>(
    "/payments/providers",
  );

  return response.data;
}

export async function connectPaymentProvider(payload: {
  provider: PaymentProviderCode;
  webhookSecret: string;
  config?: Record<string, unknown>;
}) {
  const response = await apiClient.post<PaymentProvider>(
    "/payments/providers",
    payload,
  );

  return response.data;
}

export async function disconnectPaymentProvider(provider: PaymentProviderCode) {
  const response = await apiClient.patch<PaymentProvider>(
    `/payments/providers/${provider}/disconnect`,
  );

  return response.data;
}

export async function getPayments(
  filters: PaymentFilters,
): Promise<PaymentPage> {
  const response = await apiClient.get<Payment[]>(
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
  const response = await apiClient.get<Payment>(`/payments/${paymentId}`);

  return response.data;
}
