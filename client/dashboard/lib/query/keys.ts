export const queryKeys = {
  merchant: {
    all: ["merchant"] as const,
    current: () => [...queryKeys.merchant.all, "current"] as const,
    profile: () => [...queryKeys.merchant.all, "profile"] as const,
    dashboard: () => [...queryKeys.merchant.all, "dashboard"] as const,
  },
  theme: {
    all: ["theme"] as const,
    current: () => [...queryKeys.theme.all, "current"] as const,
  },
  products: {
    all: ["products"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.products.all, "list", filters] as const,
    detail: (productId: string) =>
      [...queryKeys.products.all, "detail", productId] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.inventory.all, "list", filters] as const,
    detail: (productId: string) =>
      [...queryKeys.inventory.all, "detail", productId] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.orders.all, "list", filters] as const,
    detail: (orderId: string) =>
      [...queryKeys.orders.all, "detail", orderId] as const,
  },
  payments: {
    all: ["payments"] as const,
    providers: () => [...queryKeys.payments.all, "providers"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.payments.all, "list", filters] as const,
    detail: (paymentId: string) =>
      [...queryKeys.payments.all, "detail", paymentId] as const,
  },
  socialPosts: {
    all: ["social-posts"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.socialPosts.all, "list", filters] as const,
    detail: (postId: string) =>
      [...queryKeys.socialPosts.all, "detail", postId] as const,
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
  checkout: {
    all: ["checkout"] as const,
    detail: (sessionId: string) =>
      [...queryKeys.checkout.all, sessionId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (filters: Record<string, unknown> = {}) =>
      [...queryKeys.notifications.all, "list", filters] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, "unread-count"] as const,
  },
} as const;
