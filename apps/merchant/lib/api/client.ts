import {
  createBrowserApiClient,
  createCommerceApiServices,
  createServerApiClient,
} from "@repo/api-client";

import { env } from "@/lib/env";

export const apiClient = createBrowserApiClient({ env });
export const apiServices = createCommerceApiServices(apiClient);

export function createMerchantServerApiClient(cookieHeader?: string) {
  return createServerApiClient({
    cookieHeader,
    env,
  });
}

export function createMerchantBearerApiClient(accessToken: string) {
  return createServerApiClient({
    env,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
