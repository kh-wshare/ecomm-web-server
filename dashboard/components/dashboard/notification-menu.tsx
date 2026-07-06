// "use client";

// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// import { DashboardIcon } from "./icon";

// import { Button } from "@/components/ui/hero-controls";
// import type {
//   MerchantNotification,
//   UnreadNotificationCount,
// } from "@/types/notification";
// import { apiClient } from "@/lib/api/client";
// import { formatDate } from "@/lib/formatters/date";
// import { queryKeys } from "@/lib/query/keys";
// import { notify } from "@/lib/toast/notify";

// export function NotificationMenu() {
//   const queryClient = useQueryClient();
//   const notificationsQuery = useQuery({
//     queryKey: queryKeys.notifications.list({ limit: 6 }),
//     queryFn: async () => {
//       const response = await apiClient.get<MerchantNotification[]>(
//         "/notifications?limit=6&page=1",
//       );

//       return response.data;
//     },
//   });
//   const unreadQuery = useQuery({
//     queryKey: queryKeys.notifications.unreadCount(),
//     queryFn: async () => {
//       const response = await apiClient.get<UnreadNotificationCount>(
//         "/notifications/unread-count",
//       );

//       return response.data.count;
//     },
//   });
//   const refreshNotifications = async () => {
//     await queryClient.invalidateQueries({
//       queryKey: queryKeys.notifications.all,
//     });
//   };
//   const markRead = useMutation({
//     mutationFn: (notificationId: string) =>
//       apiClient.patch(`/notifications/${notificationId}/read`),
//     onMutate: async (notificationId) => {
//       await queryClient.cancelQueries({
//         queryKey: queryKeys.notifications.all,
//       });
//       const notifications = queryClient.getQueryData<MerchantNotification[]>(
//         queryKeys.notifications.list({ limit: 6 }),
//       );
//       const unreadCount = queryClient.getQueryData<number>(
//         queryKeys.notifications.unreadCount(),
//       );
//       queryClient.setQueryData<MerchantNotification[]>(
//         queryKeys.notifications.list({ limit: 6 }),
//         (current = []) =>
//           current.map((item) =>
//             item.id === notificationId
//               ? { ...item, readAt: new Date().toISOString() }
//               : item,
//           ),
//       );
//       queryClient.setQueryData<number>(
//         queryKeys.notifications.unreadCount(),
//         (current = 0) => Math.max(0, current - 1),
//       );
//       return { notifications, unreadCount };
//     },
//     onError: (error, _notificationId, context) => {
//       queryClient.setQueryData(
//         queryKeys.notifications.list({ limit: 6 }),
//         context?.notifications,
//       );
//       queryClient.setQueryData(
//         queryKeys.notifications.unreadCount(),
//         context?.unreadCount,
//       );
//       notify.error(error, "Unable to update notification");
//     },
//     onSettled: refreshNotifications,
//   });
//   const markAllRead = useMutation({
//     mutationFn: () => apiClient.patch("/notifications/read-all"),
//     onMutate: async () => {
//       await queryClient.cancelQueries({
//         queryKey: queryKeys.notifications.all,
//       });
//       const notifications = queryClient.getQueryData<MerchantNotification[]>(
//         queryKeys.notifications.list({ limit: 6 }),
//       );
//       const unreadCount = queryClient.getQueryData<number>(
//         queryKeys.notifications.unreadCount(),
//       );
//       const readAt = new Date().toISOString();
//       queryClient.setQueryData<MerchantNotification[]>(
//         queryKeys.notifications.list({ limit: 6 }),
//         (current = []) =>
//           current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
//       );
//       queryClient.setQueryData(queryKeys.notifications.unreadCount(), 0);
//       return { notifications, unreadCount };
//     },
//     onError: (error, _variables, context) => {
//       queryClient.setQueryData(
//         queryKeys.notifications.list({ limit: 6 }),
//         context?.notifications,
//       );
//       queryClient.setQueryData(
//         queryKeys.notifications.unreadCount(),
//         context?.unreadCount,
//       );
//       notify.error(error, "Unable to update notifications");
//     },
//     onSettled: refreshNotifications,
//   });
//   const unreadCount = unreadQuery.data ?? 0;

//   return (
//     <details className="group relative">
//       <summary className="relative grid size-10 cursor-pointer list-none place-items-center rounded-xl text-muted transition hover:bg-surface-secondary hover:text-foreground [&::-webkit-details-marker]:hidden">
//         <span className="sr-only">Notifications</span>
//         <DashboardIcon name="bell" />
//         {unreadCount > 0 && (
//           <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white">
//             {unreadCount > 99 ? "99+" : unreadCount}
//           </span>
//         )}
//       </summary>
//       <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-separator bg-surface shadow-2xl">
//         <div className="flex items-center justify-between border-b border-separator px-4 py-3">
//           <div>
//             <p className="font-semibold">Notifications</p>
//             <p className="text-xs text-muted">
//               {unreadCount
//                 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
//                 : "You are all caught up"}
//             </p>
//           </div>
//           {unreadCount > 0 && (
//             <Button
//               className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
//               disabled={markAllRead.isPending}
//               type="button"
//               onClick={() => markAllRead.mutate()}
//             >
//               Mark all read
//             </Button>
//           )}
//         </div>
//         <div className="max-h-[24rem] overflow-y-auto">
//           {notificationsQuery.isPending ? (
//             <NotificationSkeleton />
//           ) : notificationsQuery.isError ? (
//             <p className="px-4 py-8 text-center text-sm text-danger">
//               Notifications could not be loaded.
//             </p>
//           ) : notificationsQuery.data?.length ? (
//             notificationsQuery.data.map((notification) => (
//               <Button
//                 className={`block w-full border-b border-separator px-4 py-3 text-left transition last:border-0 hover:bg-surface-secondary ${
//                   notification.readAt ? "" : "bg-accent/5"
//                 }`}
//                 key={notification.id}
//                 type="button"
//                 onClick={() => {
//                   if (!notification.readAt) markRead.mutate(notification.id);
//                 }}
//               >
//                 <span className="flex items-start gap-3">
//                   <span
//                     className={`mt-1.5 size-2 shrink-0 rounded-full ${
//                       notification.readAt ? "bg-separator" : "bg-accent"
//                     }`}
//                   />
//                   <span className="min-w-0">
//                     <span className="block truncate text-sm font-semibold">
//                       {notification.title}
//                     </span>
//                     <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">
//                       {notification.message}
//                     </span>
//                     <span className="mt-1.5 block text-[11px] text-muted">
//                       {formatDate(notification.createdAt, {
//                         dateStyle: "medium",
//                         timeStyle: "short",
//                       })}
//                     </span>
//                   </span>
//                 </span>
//               </Button>
//             ))
//           ) : (
//             <div className="px-4 py-10 text-center">
//               <div className="mx-auto grid size-10 place-items-center rounded-full bg-surface-secondary text-muted">
//                 <DashboardIcon name="bell" />
//               </div>
//               <p className="mt-3 text-sm font-medium">No notifications yet</p>
//               <p className="mt-1 text-xs text-muted">
//                 New orders and stock alerts will appear here.
//               </p>
//             </div>
//           )}
//         </div>
//       </div>
//     </details>
//   );
// }

// function NotificationSkeleton() {
//   return (
//     <div className="space-y-1 p-3" role="status">
//       {Array.from({ length: 3 }, (_, index) => (
//         <div className="flex gap-3 rounded-xl p-2" key={index}>
//           <div className="size-2 animate-pulse rounded-full bg-surface-secondary" />
//           <div className="flex-1 space-y-2">
//             <div className="h-3 w-2/3 animate-pulse rounded bg-surface-secondary" />
//             <div className="h-3 w-full animate-pulse rounded bg-surface-secondary" />
//           </div>
//         </div>
//       ))}
//       <span className="sr-only">Loading notifications</span>
//     </div>
//   );
// }

"use client";

import {
  Badge,
  Button,
  Dropdown,
  ScrollShadow,
  Separator,
  Skeleton,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DashboardIcon } from "./icon";

import { apiClient } from "@/lib/api/client";
import { formatDate } from "@/lib/formatters/date";
import { queryKeys } from "@/lib/query/keys";
import { notify } from "@/lib/toast/notify";
import type {
  MerchantNotification,
  UnreadNotificationCount,
} from "@/types/notification";

const NOTIFICATION_LIMIT = 6;

export function NotificationMenu() {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list({ limit: NOTIFICATION_LIMIT }),
    queryFn: async () => {
      const response = await apiClient.get<MerchantNotification[]>(
        `/notifications?limit=${NOTIFICATION_LIMIT}&page=1`,
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

    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const notifications = queryClient.getQueryData<MerchantNotification[]>(
        queryKeys.notifications.list({ limit: NOTIFICATION_LIMIT }),
      );

      const unreadCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );

      const wasUnread =
        notifications?.some(
          (item) => item.id === notificationId && !item.readAt,
        ) ?? false;

      queryClient.setQueryData<MerchantNotification[]>(
        queryKeys.notifications.list({ limit: NOTIFICATION_LIMIT }),
        (current = []) =>
          current.map((item) =>
            item.id === notificationId
              ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
              : item,
          ),
      );

      if (wasUnread) {
        queryClient.setQueryData<number>(
          queryKeys.notifications.unreadCount(),
          (current = 0) => Math.max(0, current - 1),
        );
      }

      return { notifications, unreadCount };
    },

    onError: (error, _notificationId, context) => {
      queryClient.setQueryData(
        queryKeys.notifications.list({ limit: NOTIFICATION_LIMIT }),
        context?.notifications,
      );

      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        context?.unreadCount,
      );

      notify.error(error, "Unable to update notification");
    },

    onSettled: refreshNotifications,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch("/notifications/read-all"),

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.notifications.all,
      });

      const notifications = queryClient.getQueryData<MerchantNotification[]>(
        queryKeys.notifications.list({ limit: NOTIFICATION_LIMIT }),
      );

      const unreadCount = queryClient.getQueryData<number>(
        queryKeys.notifications.unreadCount(),
      );

      const readAt = new Date().toISOString();

      queryClient.setQueryData<MerchantNotification[]>(
        queryKeys.notifications.list({ limit: NOTIFICATION_LIMIT }),
        (current = []) =>
          current.map((item) => ({
            ...item,
            readAt: item.readAt ?? readAt,
          })),
      );

      queryClient.setQueryData<number>(
        queryKeys.notifications.unreadCount(),
        0,
      );

      return { notifications, unreadCount };
    },

    onError: (error, _variables, context) => {
      queryClient.setQueryData(
        queryKeys.notifications.list({ limit: NOTIFICATION_LIMIT }),
        context?.notifications,
      );

      queryClient.setQueryData(
        queryKeys.notifications.unreadCount(),
        context?.unreadCount,
      );

      notify.error(error, "Unable to update notifications");
    },

    onSettled: refreshNotifications,
  });

  const unreadCount = unreadQuery.data ?? 0;
  const notifications = notificationsQuery.data ?? [];
  const badgeValue = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Dropdown>
      <Button
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className="size-10 min-w-10 rounded-xl p-0 text-muted hover:bg-surface-secondary hover:text-foreground"
        isIconOnly
        type="button"
        variant="ghost"
      >
        <Badge.Anchor className="grid size-full place-items-center">
          <DashboardIcon name="bell" />
          {unreadCount > 0 && (
            <Badge size="sm" className="font-bold" color="danger">
              <Badge.Label>{badgeValue}</Badge.Label>
            </Badge>
          )}
        </Badge.Anchor>
      </Button>

      <Dropdown.Popover
        className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-separator bg-surface p-0 shadow-2xl"
        placement="bottom end"
      >
        <div className="flex items-start justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold">Notifications</p>
            <p className="mt-0.5 text-xs text-muted">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"
                }`
                : "You are all caught up"}
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              className="h-8 px-2 text-xs font-semibold"
              isDisabled={markAllRead.isPending}
              isPending={markAllRead.isPending}
              size="sm"
              type="button"
              variant="ghost"
              onPress={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        <ScrollShadow className="max-h-[24rem]">
          {notificationsQuery.isPending ? (
            <NotificationSkeleton />
          ) : notificationsQuery.isError ? (
            <NotificationError
              isPending={notificationsQuery.isFetching || unreadQuery.isFetching}
              onRetry={() => {
                void Promise.all([
                  notificationsQuery.refetch(),
                  unreadQuery.refetch(),
                ]);
              }}
            />
          ) : notifications.length > 0 ? (
            <Dropdown.Menu
              aria-label="Notifications"
              className="p-1"
              selectionMode="none"
              onAction={(key) => {
                const notificationId = String(key);
                const notification = notifications.find(
                  (item) => item.id === notificationId,
                );

                if (!notification || notification.readAt) return;

                markRead.mutate(notificationId);
              }}
            >
              {notifications.map((notification) => (
                <Dropdown.Item
                  key={notification.id}
                  className="rounded-xl p-0 data-[focused=true]:bg-surface-secondary"
                  id={notification.id}
                  textValue={`${notification.title} ${notification.message}`}
                >
                  <NotificationRow
                    isUpdating={
                      markRead.isPending &&
                      markRead.variables === notification.id
                    }
                    notification={notification}
                  />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          ) : (
            <NotificationEmpty />
          )}
        </ScrollShadow>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function NotificationRow({
  notification,
  isUpdating,
}: {
  notification: MerchantNotification;
  isUpdating: boolean;
}) {
  const isUnread = !notification.readAt;

  return (
    <div
      className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${isUnread ? "bg-accent/5" : ""
        }`}
    >
      <span
        className={`mt-1.5 size-2 shrink-0 rounded-full ${isUnread ? "bg-accent" : "bg-separator"
          }`}
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="block truncate text-sm font-semibold">
            {notification.title}
          </span>

          {isUnread && (
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              New
            </span>
          )}
        </span>

        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">
          {notification.message}
        </span>

        <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          {formatDate(notification.createdAt, {
            dateStyle: "medium",
            timeStyle: "short",
          })}

          {isUpdating && (
            <>
              <span aria-hidden="true">•</span>
              <span>Updating…</span>
            </>
          )}
        </span>
      </span>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2 p-3" role="status">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="flex gap-3 rounded-xl p-2" key={index}>
          <Skeleton className="mt-1.5 size-2 rounded-full" />

          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3 rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </div>
        </div>
      ))}

      <span className="sr-only">Loading notifications</span>
    </div>
  );
}

function NotificationError({
  isPending,
  onRetry,
}: {
  isPending: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-danger/10 text-danger">
        <DashboardIcon name="bell" />
      </div>

      <p className="mt-3 text-sm font-semibold text-danger">
        Notifications could not be loaded.
      </p>

      <p className="mt-1 text-xs text-muted">
        Check your connection and try again.
      </p>

      <Button
        className="mt-4"
        isPending={isPending}
        size="sm"
        type="button"
        variant="secondary"
        onPress={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

function NotificationEmpty() {
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-surface-secondary text-muted">
        <DashboardIcon name="bell" />
      </div>

      <p className="mt-3 text-sm font-medium">No notifications yet</p>

      <p className="mt-1 text-xs text-muted">
        New orders and stock alerts will appear here.
      </p>
    </div>
  );
}