import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
  },
  checkout: {
    all: ["checkout"] as const,
    detail: (sessionId: string) =>
      [...queryKeys.checkout.all, sessionId] as const,
  },
  branches: {
    all: ["branches"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.branches.all, "list", filters] as const,
  },
  categories: {
    all: ["categories"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.categories.all, "list", filters] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    detail: (productId: string) =>
      [...queryKeys.inventory.all, "detail", productId] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.inventory.all, "list", filters] as const,
  },
  merchant: {
    all: ["merchant"] as const,
    current: () => [...queryKeys.merchant.all, "current"] as const,
    dashboard: () => [...queryKeys.merchant.all, "dashboard"] as const,
    profile: () => [...queryKeys.merchant.all, "profile"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.notifications.all, "list", filters] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, "unread-count"] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (orderId: string) =>
      [...queryKeys.orders.all, "detail", orderId] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.orders.all, "list", filters] as const,
  },
  payments: {
    all: ["payments"] as const,
    detail: (paymentId: string) =>
      [...queryKeys.payments.all, "detail", paymentId] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.payments.all, "list", filters] as const,
    providers: () => [...queryKeys.payments.all, "providers"] as const,
  },
  products: {
    all: ["products"] as const,
    detail: (productId: string) =>
      [...queryKeys.products.all, "detail", productId] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.products.all, "list", filters] as const,
  },
  socialPosts: {
    all: ["social-posts"] as const,
    detail: (postId: string) =>
      [...queryKeys.socialPosts.all, "detail", postId] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.socialPosts.all, "list", filters] as const,
    logs: (postId: string) =>
      [...queryKeys.socialPosts.all, "detail", postId, "logs"] as const,
  },
  storefront: {
    all: ["storefront"] as const,
    home: (merchantSlug: string) =>
      [...queryKeys.storefront.all, merchantSlug] as const,
    product: (merchantSlug: string, productSlug: string) =>
      [
        ...queryKeys.storefront.all,
        merchantSlug,
        "products",
        productSlug,
      ] as const,
  },
  theme: {
    all: ["theme"] as const,
    current: () => [...queryKeys.theme.all, "current"] as const,
  },
} as const;

export type MutationErrorShape = {
  fields?: Record<string, string[]>;
  message?: string;
};

export function getMutationErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
) {
  if (error instanceof Error && error.message) return error.message;
  if (isMutationErrorShape(error) && error.message) return error.message;

  return fallback;
}

export function getMutationFieldErrors(error: unknown) {
  return isMutationErrorShape(error) ? (error.fields ?? {}) : {};
}

function isMutationErrorShape(error: unknown): error is MutationErrorShape {
  return Boolean(error && typeof error === "object");
}
