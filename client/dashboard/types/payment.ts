import type { PaginationMeta } from "@/lib/api/client";

export type PaymentProviderCode = "HMAC" | "KHQR" | "ABA_PAYWAY";
export type PaymentProviderStatus = "ACTIVE" | "INACTIVE";
export type PaymentTransactionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "REFUNDED";

export type PaymentProvider = {
  id: string;
  provider: PaymentProviderCode;
  status: PaymentProviderStatus;
  config: Record<string, unknown>;
  hasWebhookSecret: boolean;
  hasProviderSecret: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentWebhookEvent = {
  id: string;
  eventId: string;
  status: "RECEIVED" | "PROCESSED" | "FAILED";
  error: string | null;
  processedAt: string | null;
  createdAt: string;
};

export type Payment = {
  id: string;
  orderId: string;
  provider: PaymentProviderCode;
  providerTransactionId: string;
  amount: string;
  currency: string;
  status: PaymentTransactionStatus;
  paidAt: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    status?: string;
    paymentStatus?: string;
  };
  webhookEvents?: PaymentWebhookEvent[];
};

export type PaymentFilters = {
  search: string;
  provider: PaymentProviderCode | "ALL";
  status: PaymentTransactionStatus | "ALL";
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
};

export type PaymentPage = {
  items: Payment[];
  meta: PaginationMeta;
};
