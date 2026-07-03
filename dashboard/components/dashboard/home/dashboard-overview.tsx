"use client";

import { useQuery } from "@tanstack/react-query";

import { DashboardHomeLoading } from "./dashboard-home-loading";
import { MetricCard } from "./metric-card";
import { RecentOrders } from "./recent-orders";
import { SalesChart } from "./sales-chart";
import { StockAlerts } from "./stock-alerts";

import { getDashboardHomeData } from "@/lib/dashboard/home-data";
import { formatCurrency } from "@/lib/formatters/currency";
import { queryKeys } from "@/lib/query/keys";

export function DashboardOverview() {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.merchant.dashboard(),
    queryFn: getDashboardHomeData,
  });

  if (dashboardQuery.isPending) return <DashboardHomeLoading />;

  if (dashboardQuery.isError) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger/10 text-xl font-bold text-danger">
            !
          </div>
          <h2 className="mt-4 text-xl font-semibold">
            Dashboard data is unavailable
          </h2>
          <p className="mt-2 text-sm text-muted">
            {dashboardQuery.error.message}
          </p>
          <button
            className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            type="button"
            onClick={() => dashboardQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const data = dashboardQuery.data;
  const isEmpty = data.totalOrders === 0 && data.inventoryCount === 0;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-accent">Overview</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Commerce at a glance
        </h2>
        <p className="mt-2 text-sm text-muted">
          Revenue, orders, and inventory health across your active merchant.
        </p>
      </div>
      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 px-6 py-5">
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
