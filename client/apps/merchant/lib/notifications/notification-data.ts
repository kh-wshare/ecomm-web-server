import type { ApiResponse } from "@repo/types";

import type {
  MerchantNotification,
  UnreadNotificationCount,
} from "@/types/notification";

const commerceBasePath = "/merchant/api/commerce";

export async function getNotifications(limit = 6) {
  const response = await notificationRequest<
    ApiResponse<MerchantNotification[]>
  >(`/notifications?${new URLSearchParams({ limit: String(limit), page: "1" })}`);

  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await notificationRequest<ApiResponse<UnreadNotificationCount>>(
    "/notifications/unread-count",
  );

  return response.data.count;
}

export async function markNotificationRead(notificationId: string) {
  const response = await notificationRequest<ApiResponse<MerchantNotification>>(
    `/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );

  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await notificationRequest<
    ApiResponse<{ readAt: string; updated: number }>
  >(
    "/notifications/read-all",
    { method: "PATCH" },
  );

  return response.data;
}

async function notificationRequest<T>(
  path: string,
  options: { method?: string } = {},
) {
  const response = await fetch(`${commerceBasePath}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    method: options.method ?? "GET",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Notification request failed";

    throw new Error(message);
  }

  return payload as T;
}
