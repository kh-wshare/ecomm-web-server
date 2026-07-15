import { createBrowserApiClient } from "@repo/api-client";
import type {
  ApiResponse,
  CheckoutSession,
  CreateCheckoutPayload,
  CreatedCheckoutSession,
  Payment,
  PaymentProviderCode,
} from "@repo/types";

import { env } from "@/lib/env";

const apiClient = createBrowserApiClient({ env });

export async function createCheckoutSession(payload: CreateCheckoutPayload) {
  const response = await apiClient.post<
    ApiResponse<CreatedCheckoutSession>,
    CreateCheckoutPayload
  >("/checkout/session", payload);

  return response.data;
}

export async function getCheckoutSession(
  sessionId: string,
  checkoutToken: string,
) {
  const response = await apiClient.get<ApiResponse<CheckoutSession>>(
    `/checkout/session/${sessionId}`,
    checkoutRequest(checkoutToken),
  );

  return response.data;
}

export async function confirmCheckoutSession(
  sessionId: string,
  checkoutToken: string,
) {
  const response = await apiClient.post<
    ApiResponse<CheckoutSession>,
    undefined
  >(
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
  const response = await apiClient.post<
    ApiResponse<Payment>,
    {
      checkoutToken: string;
      orderId: string;
      provider: PaymentProviderCode;
    }
  >("/payments/create-intent", { checkoutToken, orderId, provider });

  return response.data;
}

export const createPaymentIntent = createCheckoutPaymentIntent;

function checkoutRequest(checkoutToken: string) {
  return {
    headers: {
      "X-Checkout-Token": checkoutToken,
    },
  };
}
