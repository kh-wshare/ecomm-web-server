import type {
  CheckoutSession,
  CreateCheckoutPayload,
  CreatedCheckoutSession,
} from "@/types/checkout";
import type { Payment, PaymentProviderCode } from "@/types/payment";
import { apiClient } from "@/lib/api/client";

const publicRequest = {
  authenticated: false,
  merchantId: null,
};

export async function createCheckoutSession(payload: CreateCheckoutPayload) {
  const response = await apiClient.post<CreatedCheckoutSession>(
    "/checkout/session",
    payload,
    publicRequest,
  );

  return response.data;
}

export async function getCheckoutSession(
  sessionId: string,
  checkoutToken: string,
) {
  const response = await apiClient.get<CheckoutSession>(
    `/checkout/session/${sessionId}`,
    checkoutRequest(checkoutToken),
  );

  return response.data;
}

export async function confirmCheckoutSession(
  sessionId: string,
  checkoutToken: string,
) {
  const response = await apiClient.post<CheckoutSession>(
    `/checkout/session/${sessionId}/confirm`,
    undefined,
    checkoutRequest(checkoutToken),
  );

  return response.data;
}

export async function createCheckoutPaymentIntent(
  orderId: string,
  checkoutToken: string,
  provider: PaymentProviderCode,
) {
  const response = await apiClient.post<Payment>(
    "/payments/create-intent",
    {
      orderId,
      checkoutToken,
      provider,
    },
    publicRequest,
  );

  return response.data;
}

export const createPaymentIntent = createCheckoutPaymentIntent;

function checkoutRequest(checkoutToken: string) {
  return {
    ...publicRequest,
    headers: {
      "X-Checkout-Token": checkoutToken,
    },
  };
}
