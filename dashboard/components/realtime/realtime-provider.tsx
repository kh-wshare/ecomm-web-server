"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

import type { DashboardInventoryStock } from "@/types/dashboard";
import { env } from "@/config/env";
import { authTokenStorage } from "@/lib/auth/token-storage";
import { queryKeys } from "@/lib/query/keys";
import { notify } from "@/lib/toast/notify";

type RealtimeEventType =
  | "inventory.low_stock"
  | "inventory.out_of_stock"
  | "order.created"
  | "payment.confirmed"
  | "payment.failed"
  | "payment.webhook_failed"
  | "social.post_published";

type RealtimeEvent = {
  type: RealtimeEventType;
  occurredAt: string;
  payload: {
    merchantId?: string;
    orderId?: string;
    orderNumber?: string;
    paymentId?: string;
    inventoryStockId?: string;
    productId?: string;
    variantId?: string | null;
    availableStock?: number;
    socialPostId?: string;
    platforms?: string[];
    error?: string;
  };
};

type RealtimeStatus = "connecting" | "connected" | "disconnected";

const RealtimeContext = createContext<RealtimeStatus>("disconnected");
const getServerToken = () => null;

export function RealtimeProvider({
  children,
  merchantId,
  permissions,
}: {
  children: React.ReactNode;
  merchantId: string;
  permissions: string[];
}) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(
    authTokenStorage.subscribe,
    authTokenStorage.getAccessToken,
    getServerToken,
  );
  const permissionKey = permissions.slice().sort().join("|");
  const permissionSet = useMemo(
    () => new Set(permissionKey.split("|").filter(Boolean)),
    [permissionKey],
  );
  const status = useRealtimeConnection({
    merchantId,
    permissionSet,
    queryClient,
    token,
  });

  return (
    <RealtimeContext.Provider value={status}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext);
}

export function RealtimeStatusIndicator() {
  const status = useRealtimeStatus();
  const label = {
    connected: "Live updates connected",
    connecting: "Connecting live updates",
    disconnected: "Live updates disconnected",
  }[status];

  return (
    <span
      aria-label={label}
      className="hidden items-center gap-2 rounded-full border border-separator px-2.5 py-1 text-[10px] font-semibold text-muted sm:inline-flex"
      title={label}
    >
      <span
        className={`size-2 rounded-full ${
          status === "connected"
            ? "bg-success"
            : status === "connecting"
              ? "animate-pulse bg-warning"
              : "bg-muted"
        }`}
      />
      Live
    </span>
  );
}

function useRealtimeConnection({
  merchantId,
  permissionSet,
  queryClient,
  token,
}: {
  merchantId: string;
  permissionSet: Set<string>;
  queryClient: ReturnType<typeof useQueryClient>;
  token: string | null;
}): RealtimeStatus {
  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      if (event.payload.merchantId !== merchantId) return;

      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });

      if (event.type === "order.created") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.merchant.dashboard(),
        });
        if (permissionSet.has("order.read")) {
          notify.info(
            "New order received",
            event.payload.orderNumber
              ? `Order ${event.payload.orderNumber} is ready for review.`
              : "A new order is ready for review.",
          );
        }
        return;
      }

      if (event.type.startsWith("payment.")) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.payments.all,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.merchant.dashboard(),
        });
        if (event.payload.orderId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.orders.detail(event.payload.orderId),
          });
        }
        if (
          permissionSet.has("payment.read") ||
          permissionSet.has("order.read")
        ) {
          if (event.type === "payment.confirmed") {
            notify.success(
              "Payment confirmed",
              "Order totals are now updated.",
            );
          } else {
            notify.warning(
              event.type === "payment.failed"
                ? "Payment failed"
                : "Payment webhook failed",
              event.payload.error ??
                "Review the payment transaction for details.",
            );
          }
        }
        return;
      }

      if (event.type.startsWith("inventory.")) {
        updateInventoryCache(queryClient, event);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.all,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.products.all,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.merchant.dashboard(),
        });
        if (permissionSet.has("inventory.read")) {
          const description =
            typeof event.payload.availableStock === "number"
              ? `${event.payload.availableStock} available units remain.`
              : "Review inventory availability.";
          notify.warning(
            event.type === "inventory.out_of_stock"
              ? "Product is out of stock"
              : "Product stock is low",
            description,
          );
        }
        return;
      }

      if (event.type === "social.post_published") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.socialPosts.all,
        });
      }
    },
    [merchantId, permissionSet, queryClient],
  );
  const status = useSocketStatus(token, merchantId, handleEvent);

  return status;
}

function useSocketStatus(
  token: string | null,
  merchantId: string,
  onEvent: (event: RealtimeEvent) => void,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("disconnected");

  useEffect(() => {
    if (!token || !merchantId) return;
    let reportedFailure = false;
    const connectingTimer = window.setTimeout(() => setStatus("connecting"), 0);
    const socket = io(`${env.NEXT_PUBLIC_WEBSOCKET_URL}/notifications`, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      transports: ["websocket", "polling"],
    });
    const handleReady = (payload: { merchantId?: string }) => {
      if (payload.merchantId !== merchantId) {
        socket.disconnect();
        return;
      }
      if (reportedFailure) {
        notify.success("Live updates restored");
      }
      reportedFailure = false;
      setStatus("connected");
    };
    const handleFailure = () => {
      setStatus("disconnected");
      if (reportedFailure) return;
      reportedFailure = true;
      notify.warning(
        "Live updates unavailable",
        "The dashboard will keep retrying in the background.",
      );
    };
    const handleAuthError = (payload: { message?: string }) => {
      if (payload.message === "Unauthorized") authTokenStorage.clear();
      handleFailure();
    };
    const handleNotification = (value: unknown) => {
      if (isRealtimeEvent(value)) onEvent(value);
    };

    socket.on("notifications.ready", handleReady);
    socket.on("notifications.error", handleAuthError);
    socket.on("notification", handleNotification);
    socket.on("connect_error", handleFailure);
    socket.on("disconnect", handleFailure);
    socket.connect();

    return () => {
      window.clearTimeout(connectingTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [merchantId, onEvent, token]);

  return status;
}

function updateInventoryCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: RealtimeEvent,
) {
  const stockId = event.payload.inventoryStockId;
  const availableStock = event.payload.availableStock;
  if (!stockId || typeof availableStock !== "number") return;

  queryClient.setQueriesData<DashboardInventoryStock[]>(
    { queryKey: [...queryKeys.inventory.all, "list"] },
    (current) =>
      current?.map((stock) =>
        stock.id === stockId
          ? {
              ...stock,
              availableStock,
              onlineSellableStock: Math.max(
                0,
                availableStock - stock.safetyBuffer,
              ),
            }
          : stock,
      ),
  );
}

function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<RealtimeEvent>;
  return (
    typeof event.type === "string" &&
    [
      "inventory.low_stock",
      "inventory.out_of_stock",
      "order.created",
      "payment.confirmed",
      "payment.failed",
      "payment.webhook_failed",
      "social.post_published",
    ].includes(event.type) &&
    typeof event.payload === "object" &&
    event.payload !== null
  );
}
