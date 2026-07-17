import type {
  FulfillmentStatus,
  OrderStatus,
  PaginationMeta,
  PaymentStatus,
  SalesChannel,
} from "@repo/types";

export type { FulfillmentStatus, OrderStatus, PaymentStatus, SalesChannel };

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type OrderPaymentSummary = {
  id: string;
  provider: string;
  providerTransactionId: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
} | null;

export type OrderTimelineEvent = {
  id: string;
  action: string;
  after: Record<string, unknown> | null;
  createdAt: string;
  user: { fullName: string } | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  sourceChannel: SalesChannel;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotalAmount: string;
  discountAmount: string;
  feeAmount: string;
  totalAmount: string;
  currency: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment?: OrderPaymentSummary;
  timeline?: OrderTimelineEvent[];
};

export type OrderFilters = {
  search: string;
  paymentStatus: PaymentStatus | "ALL";
  fulfillmentStatus: FulfillmentStatus | "ALL";
  sourceChannel: SalesChannel | "ALL";
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
};

export type OrderPage = {
  items: Order[];
  meta: PaginationMeta;
};
