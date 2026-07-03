"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DashboardIcon } from "./icon";

import type {
  MerchantNotification,
  UnreadNotificationCount,
} from "@/types/notification";
import { apiClient } from "@/lib/api/client";
import { formatDate } from "@/lib/formatters/date";
import { queryKeys } from "@/lib/query/keys";
import { notify } from "@/lib/toast/notify";

export function NotificationMenu() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list({ limit: 6 }),
    queryFn: async () => {
      const response = await apiClient.get<MerchantNotification[]>(
        "/notifications?limit=6&page=1",
      );

      return response.data;
    },
  });
  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get<UnreadNotificationCount>(
        "/notifications/unread-count",
      );

      return response.data.count;
    },
  });
  const refreshNotifications = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all,
    });
  };
  const markRead = useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch(`/notifications/${notificationId}/read`),
    onSuccess: refreshNotifications,
    onError: (error) => notify.error(error, "Unable to update notification"),
  });
  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch("/notifications/read-all"),
    onSuccess: refreshNotifications,
    onError: (error) => notify.error(error, "Unable to update notifications"),
  });
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <details className="group relative">
      <summary className="relative grid size-10 cursor-pointer list-none place-items-center rounded-xl text-muted transition hover:bg-surface-secondary hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Notifications</span>
        <DashboardIcon name="bell" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </summary>
      <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-separator bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-separator px-4 py-3">
          <div>
            <p className="font-semibold">Notifications</p>
            <p className="text-xs text-muted">
              {unreadCount
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "You are all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
              disabled={markAllRead.isPending}
              type="button"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[24rem] overflow-y-auto">
          {notificationsQuery.isPending ? (
            <NotificationSkeleton />
          ) : notificationsQuery.isError ? (
            <p className="px-4 py-8 text-center text-sm text-danger">
              Notifications could not be loaded.
            </p>
          ) : notificationsQuery.data?.length ? (
            notificationsQuery.data.map((notification) => (
              <button
                className={`block w-full border-b border-separator px-4 py-3 text-left transition last:border-0 hover:bg-surface-secondary ${
                  notification.readAt ? "" : "bg-accent/5"
                }`}
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.readAt) markRead.mutate(notification.id);
                }}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.readAt ? "bg-separator" : "bg-accent"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">
                      {notification.message}
                    </span>
                    <span className="mt-1.5 block text-[11px] text-muted">
                      {formatDate(notification.createdAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-surface-secondary text-muted">
                <DashboardIcon name="bell" />
              </div>
              <p className="mt-3 text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted">
                New orders and stock alerts will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-1 p-3" role="status">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="flex gap-3 rounded-xl p-2" key={index}>
          <div className="size-2 animate-pulse rounded-full bg-surface-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-secondary" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-secondary" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading notifications</span>
    </div>
  );
}
