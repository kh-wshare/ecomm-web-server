import type { ApiClient } from "@repo/api-client";
import type { ApiResponse } from "@repo/types";

import type {
  DashboardHomeData,
  DashboardInventoryStock,
  DashboardOrder,
  SalesPoint,
} from "@/types/dashboard";

export async function getDashboardHomeData(
  apiClient: ApiClient,
): Promise<DashboardHomeData> {
  const [recentResponse, pendingResponse, paidOrders, inventory] =
    await Promise.all([
      apiClient.get<ApiResponse<DashboardOrder[]>>("/orders?limit=5&page=1"),
      apiClient.get<ApiResponse<DashboardOrder[]>>(
        "/orders?status=PENDING_PAYMENT&limit=1&page=1",
      ),
      fetchAllPages<DashboardOrder>(apiClient, "/orders?paymentStatus=PAID"),
      fetchAllPages<DashboardInventoryStock>(apiClient, "/inventory"),
    ]);
  const lowStock = inventory
    .filter(
      (stock) =>
        stock.availableStock <= 0 ||
        (stock.safetyBuffer > 0 && stock.availableStock <= stock.safetyBuffer),
    )
    .sort((left, right) => left.availableStock - right.availableStock);
  const currency = paidOrders[0]?.currency ?? "USD";

  return {
    currency,
    inventoryCount: inventory.length,
    lowStock,
    paidOrders,
    pendingOrders: pendingResponse.meta?.total ?? 0,
    recentOrders: recentResponse.data,
    sales: buildSalesSeries(paidOrders),
    totalOrders: recentResponse.meta?.total ?? 0,
    totalRevenue: paidOrders.reduce(
      (total, order) => total + Number(order.totalAmount),
      0,
    ),
  };
}

async function fetchAllPages<T>(apiClient: ApiClient, path: string) {
  const values: T[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const separator = path.includes("?") ? "&" : "?";
    const response = await apiClient.get<ApiResponse<T[]>>(
      `${path}${separator}limit=100&page=${page}`,
    );

    values.push(...response.data);
    hasNext = response.meta?.hasNext ?? false;
    page += 1;
  }

  return values;
}

function buildSalesSeries(orders: DashboardOrder[]): SalesPoint[] {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    return {
      date: localDateKey(date),
      label: formatter.format(date),
      revenue: 0,
    };
  });
  const pointByDate = new Map(days.map((point) => [point.date, point]));

  for (const order of orders) {
    const date = new Date(order.paidAt ?? order.createdAt);
    const point = pointByDate.get(localDateKey(date));

    if (point) point.revenue += Number(order.totalAmount);
  }

  return days;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
