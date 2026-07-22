"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { Button } from "@repo/ui";
import { queryKeys } from "@repo/query-client";

import { DashboardIcon } from "./dashboard-icon";

import { useCloseDetailsOnOutsideClick } from "@/hooks/use-close-details-on-outside-click";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/notification-data";
import { formatDate } from "@/lib/formatters/date";
import { notify } from "@/lib/toast/notify";
import type { MerchantNotification } from "@/types/notification";

const notificationListKey = queryKeys.notifications.list({ limit: 6 });

type NotificationMutationContext = {
  notifications?: MerchantNotification[];
  unreadCount?: number;
};

export function NotificationMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const queryClient = useQueryClient();
  useCloseDetailsOnOutsideClick(menuRef);
  const notificationsQuery = useQuery({
    queryFn: () => getNotifications(6),
    queryKey: notificationListKey,
  });
  const unreadQuery = useQuery({
    queryFn: getUnreadNotificationCount,
    queryKey: queryKeys.notifications.unreadCount(),
  });
  const refreshNotifications = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all,
    });
  };
  const markRead = useMutation<
    MerchantNotification,
    Error,
    string,
    NotificationMutationContext
  >({
    mutationFn: markNotificationRead,
    onError: (error, _notificationId, context) => {
      queryClient.setQueryData(notificationListKey, context?.notifications);
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        context?.unreadCount,
      );
      notify.error(error, "Unable to update notification");
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const notifications =
        queryClient.getQueryData<MerchantNotification[]>(notificationListKey);
      const unreadCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );

      queryClient.setQueryData<MerchantNotification[]>(
        notificationListKey,
        (current = []) =>
          current.map((item) =>
            item.id === notificationId
              ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
              : item,
          ),
      );
      queryClient.setQueryData<number>(
        queryKeys.notifications.unreadCount(),
        (current = 0) => Math.max(0, current - 1),
      );

      return { notifications, unreadCount };
    },
    onSettled: refreshNotifications,
  });
  const markAllRead = useMutation<
    { readAt: string; updated: number },
    Error,
    void,
    NotificationMutationContext
  >({
    mutationFn: markAllNotificationsRead,
    onError: (error, _variables, context) => {
      queryClient.setQueryData(notificationListKey, context?.notifications);
      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        context?.unreadCount,
      );
      notify.error(error, "Unable to update notifications");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });
      const notifications =
        queryClient.getQueryData<MerchantNotification[]>(notificationListKey);
      const unreadCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );
      const readAt = new Date().toISOString();

      queryClient.setQueryData<MerchantNotification[]>(
        notificationListKey,
        (current = []) =>
          current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      );
      queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);

      return { notifications, unreadCount };
    },
    onSettled: refreshNotifications,
  });
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <details className="group relative" ref={menuRef}>
      <summary className="relative grid size-10 cursor-pointer list-none place-items-center rounded-lg text-muted transition hover:bg-primary/20 hover:text-primary group-open:bg-primary/20 group-open:text-primary [&::-webkit-details-marker]:hidden">
        <span className="sr-only">Notifications</span>
        <DashboardIcon name="bell" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </summary>
      <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-separator bg-surface shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-separator px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              Notifications
            </p>
            <p className="truncate text-xs text-muted">
              {unreadCount
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "You are all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              className="shrink-0 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              isDisabled={markAllRead.isPending}
              type="button"
              variant="ghost"
              onPress={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
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
              <Button
                className={`block h-auto w-full rounded-none border-b border-separator px-4 py-3 text-left transition last:border-0 hover:bg-surface-secondary ${
                  notification.readAt
                    ? ""
                    : "bg-primary/5"
                }`}
                key={notification.id}
                type="button"
                variant="ghost"
                onPress={() => {
                  if (!notification.readAt) markRead.mutate(notification.id);
                }}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      notification.readAt
                        ? "bg-surface-secondary"
                        : "bg-primary"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">
                      {notification.message}
                    </span>
                    <span className="mt-1.5 block text-[11px] text-muted">
                      {formatDate(notification.createdAt)}
                    </span>
                  </span>
                </span>
              </Button>
            ))
          ) : (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto grid size-10 place-items-center rounded-full bg-surface-secondary text-muted">
                <DashboardIcon name="bell" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">
                No notifications yet
              </p>
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
        <div className="flex gap-3 rounded-lg p-2" key={index}>
          <div className="mt-1 size-2 animate-pulse rounded-full bg-surface-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-secondary" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-secondary" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}
