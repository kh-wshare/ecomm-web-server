"use client";

import { useQuery } from "@tanstack/react-query";

import { Button } from "@repo/ui";
import { queryKeys } from "@repo/query-client";

import { DashboardHomeLoading } from "./dashboard-home-loading";
import { MetricCard } from "./metric-card";
import { RecentOrders } from "./recent-orders";
import { SalesChart } from "./sales-chart";
import { StockAlerts } from "./stock-alerts";

import type { DashboardHomeData } from "@/types/dashboard";
import { formatCurrency } from "@/lib/formatters/currency";

const DASHBOARD_HOME_DATA_PATH = "/merchant/api/dashboard/home";

export function DashboardOverview() {
  const dashboardQuery = useQuery({
    queryFn: async () => {
      const response = await fetch(DASHBOARD_HOME_DATA_PATH, {
        credentials: "include",
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(error?.message ?? "Dashboard data is unavailable");
      }

      return (await response.json()) as DashboardHomeData;
    },
    queryKey: queryKeys.merchant.dashboard(),
  });

  if (dashboardQuery.isPending) return <DashboardHomeLoading />;

  if (dashboardQuery.isError) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-lg bg-red-50 text-xl font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
            !
          </div>
          <h2 className="mt-4 text-xl font-semibold">
            Dashboard data is unavailable
          </h2>
          <p className="mt-2 text-sm text-muted">
            {dashboardQuery.error.message}
          </p>
          <Button
            className="mt-5 bg-emerald-600 text-white hover:bg-emerald-700"
            type="button"
            onPress={() => void dashboardQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const data = dashboardQuery.data;
  const isEmpty = data.totalOrders === 0 && data.inventoryCount === 0;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Overview
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-normal">
          Commerce at a glance
        </h2>
        <p className="mt-2 text-sm text-muted">
          Revenue, orders, and inventory health across your active merchant.
        </p>
      </div>
      {isEmpty && (
        <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-6 py-5 dark:border-emerald-900/70 dark:bg-emerald-950/40">
          <p className="font-semibold">Your workspace is ready</p>
          <p className="mt-1 text-sm text-muted">
            Add your first product and inventory quantity to start seeing live
            dashboard insights.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent="success"
          helper={`${data.paidOrders.length} paid order${
            data.paidOrders.length === 1 ? "" : "s"
          }`}
          icon="card"
          label="Total revenue"
          value={formatCurrency(data.totalRevenue, data.currency)}
        />
        <MetricCard
          accent="accent"
          helper="Across all sales channels"
          icon="orders"
          label="Total orders"
          value={data.totalOrders.toLocaleString()}
        />
        <MetricCard
          accent="warning"
          helper="Awaiting customer payment"
          icon="orders"
          label="Pending orders"
          value={data.pendingOrders.toLocaleString()}
        />
        <MetricCard
          accent="danger"
          helper="Low or out of stock"
          icon="inventory"
          label="Stock alerts"
          value={data.lowStock.length.toLocaleString()}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SalesChart currency={data.currency} sales={data.sales} />
        <StockAlerts alerts={data.lowStock} />
        <RecentOrders orders={data.recentOrders} />
      </div>
    </section>
  );
}
