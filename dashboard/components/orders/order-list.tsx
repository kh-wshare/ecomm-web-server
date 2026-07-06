"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";

import { OrderStatusBadge } from "./order-status-badge";

import { Button, Input, Select } from "@/components/ui/hero-controls";
import { Table } from "@/components/ui/hero-table";
import type {
  FulfillmentStatus,
  OrderFilters,
  PaymentStatus,
  SalesChannel,
} from "@/types/order";
import { useOrders } from "@/hooks/api/use-orders";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";

const initialFilters: OrderFilters = {
  search: "",
  paymentStatus: "ALL",
  fulfillmentStatus: "ALL",
  sourceChannel: "ALL",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 15,
};

export function OrderTable() {
  const { can } = usePermissions();
  const canRead = can("order.read");
  const [filters, setFilters] = useState(initialFilters);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const queryFilters = { ...filters, search: deferredSearch };
  const ordersQuery = useOrders(queryFilters, canRead);
  const update = <Key extends keyof OrderFilters>(
    key: Key,
    value: OrderFilters[Key],
  ) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  if (!canRead) return <Notice message="You cannot view merchant orders." />;

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm font-medium text-accent">Orders</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Order management
        </h2>
        <p className="mt-2 text-sm text-muted">
          Search, review, and fulfill orders from every sales channel.
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 md:grid-cols-2 xl:grid-cols-6">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">
            Order or customer
          </span>
          <Input
            className="h-10 w-full rounded-xl border border-separator bg-background px-3 text-sm outline-none focus:border-accent"
            placeholder="Search order number, name, or email"
            type="search"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
          />
        </label>
        <FilterSelect
          label="Payment"
          value={filters.paymentStatus}
          options={["ALL", "PENDING", "PAID", "FAILED", "REFUNDED"]}
          onChange={(value) =>
            update("paymentStatus", value as PaymentStatus | "ALL")
          }
        />
        <FilterSelect
          label="Fulfillment"
          value={filters.fulfillmentStatus}
          options={[
            "ALL",
            "UNFULFILLED",
            "PROCESSING",
            "FULFILLED",
            "CANCELLED",
          ]}
          onChange={(value) =>
            update("fulfillmentStatus", value as FulfillmentStatus | "ALL")
          }
        />
        <FilterSelect
          label="Channel"
          value={filters.sourceChannel}
          options={["ALL", "POS", "WEBSITE", "FACEBOOK", "INSTAGRAM", "TIKTOK"]}
          onChange={(value) =>
            update("sourceChannel", value as SalesChannel | "ALL")
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <DateField
            label="From"
            value={filters.dateFrom}
            onChange={(value) => update("dateFrom", value)}
          />
          <DateField
            label="To"
            value={filters.dateTo}
            onChange={(value) => update("dateTo", value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm">
        {ordersQuery.isPending ? (
          <Loading />
        ) : ordersQuery.isError ? (
          <ErrorState
            message={ordersQuery.error.message}
            onRetry={() => ordersQuery.refetch()}
          />
        ) : ordersQuery.data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-surface-secondary text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Channel</th>
                    <th className="px-4 py-3 font-medium">Order status</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Fulfillment</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersQuery.data.items.map((order) => (
                    <tr
                      className="border-t border-separator hover:bg-surface-secondary/60"
                      key={order.id}
                    >
                      <td className="px-4 py-4">
                        <Link
                          className="font-semibold hover:text-accent"
                          href={`/dashboard/orders/${order.id}`}
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {formatDate(
                            order.createdAt,
                            { dateStyle: "medium", timeStyle: "short" },
                            "en-US",
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium">
                          {order.customerName || "Guest customer"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {order.customerEmail || "No email"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold">
                        {order.sourceChannel}
                      </td>
                      <td className="px-4 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4">
                        <OrderStatusBadge status={order.paymentStatus} />
                      </td>
                      <td className="px-4 py-4">
                        <OrderStatusBadge status={order.fulfillmentStatus} />
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination
              page={ordersQuery.data.meta.page}
              total={ordersQuery.data.meta.total}
              totalPages={ordersQuery.data.meta.totalPages}
              onPage={(page) => setFilters((current) => ({ ...current, page }))}
            />
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No orders found</p>
            <p className="mt-1 text-sm text-muted">
              Try changing one of the filters.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export const OrderList = OrderTable;

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Select
        className="h-10 w-full rounded-xl border border-separator bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </Select>
    </label>
  );
}

function DateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Input
        className="h-10 w-full rounded-xl border border-separator bg-background px-2 text-xs"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Pagination({
  onPage,
  page,
  total,
  totalPages,
}: {
  onPage: (page: number) => void;
  page: number;
  total: number;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-separator px-4 py-3">
      <p className="text-xs text-muted">{total} total orders</p>
      <div className="flex items-center gap-3">
        <PageButton
          disabled={page <= 1}
          label="Previous"
          onClick={() => onPage(page - 1)}
        />
        <span className="text-xs text-muted">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <PageButton
          disabled={page >= totalPages}
          label="Next"
          onClick={() => onPage(page + 1)}
        />
      </div>
    </div>
  );
}

function PageButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      className="rounded-lg border border-separator px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function Loading() {
  return <div className="h-[460px] animate-pulse bg-surface-secondary/50" />;
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
      {message}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-semibold">Orders are unavailable</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      <Button
        className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        type="button"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
