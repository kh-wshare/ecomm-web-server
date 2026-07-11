import type { Payment } from "@/types/payment";

export type CheckoutSessionStatus =
  | "ACTIVE"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export type CheckoutItem = {
  id: string;
  productId: string;
  variantId: string | null;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type CheckoutOrder = {
  id: string;
  orderNumber: string;
  status: string;
};

export type CheckoutSession = {
  id: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  sourceChannel: "WEBSITE";
  status: CheckoutSessionStatus;
  subtotalAmount: string;
  discountAmount: string;
  feeAmount: string;
  totalAmount: string;
  currency: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  items: CheckoutItem[];
  order: CheckoutOrder | null;
};

export type CreatedCheckoutSession = CheckoutSession & {
  checkoutToken: string;
};

export type CreateCheckoutPayload = {
  merchantSlug: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  sourceChannel: "WEBSITE";
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
};

export type CheckoutContext = {
  token: string;
  merchantSlug: string;
  productSlug: string;
  payment?: Pick<
    Payment,
    | "id"
    | "orderId"
    | "provider"
    | "providerTransactionId"
    | "amount"
    | "currency"
    | "status"
    | "createdAt"
  >;
};
