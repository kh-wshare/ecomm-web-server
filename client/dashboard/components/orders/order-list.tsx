"use client";

import { useDeferredValue, useState } from "react";
import {
  Button,
  Input,
  Label,
  ListBox,
  Pagination,
  SearchField,
  Select,
  Table,
} from "@heroui/react";
import Link from "next/link";

import { OrderStatusBadge } from "./order-status-badge";

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
        <div className="md:col-span-2">
          <SearchField name="search" value={filters.search}>
            <Label>Order or customer</Label>
            <SearchField.Group className="bg-surface-secondary shadow-none">
              <SearchField.SearchIcon />
              <SearchField.Input
                value={filters.search}
                onChange={(event) => update("search", event.target.value)}
                placeholder="Search order number, name, or email"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Orders"
                  className="min-w-[980px] text-left text-sm"
                  selectionMode="none"
                >
                  <Table.Header className="text-xs font-semibold text-muted">
                    <Table.Column
                      className="px-4 py-3 font-medium"
                      id="order"
                      isRowHeader
                    >
                      Order
                    </Table.Column>
                    <Table.Column
                      className="px-4 py-3 font-medium"
                      id="customer"
                    >
                      Customer
                    </Table.Column>
                    <Table.Column
                      className="px-4 py-3 font-medium"
                      id="channel"
                    >
                      Channel
                    </Table.Column>
                    <Table.Column className="px-4 py-3 font-medium" id="status">
                      Order status
                    </Table.Column>
                    <Table.Column
                      className="px-4 py-3 font-medium"
                      id="payment"
                    >
                      Payment
                    </Table.Column>
                    <Table.Column
                      className="px-4 py-3 font-medium"
                      id="fulfillment"
                    >
                      Fulfillment
                    </Table.Column>
                    <Table.Column
                      className="px-4 py-3 text-right font-medium"
                      id="total"
                    >
                      Total
                    </Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {ordersQuery.data.items.map((order) => (
                      <Table.Row
                        className="border-t border-separator hover:bg-surface-secondary/60"
                        id={order.id}
                        key={order.id}
                      >
                        <Table.Cell className="px-4 py-4">
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
                        </Table.Cell>
                        <Table.Cell className="px-4 py-4">
                          <p className="font-medium">
                            {order.customerName || "Guest customer"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {order.customerEmail || "No email"}
                          </p>
                        </Table.Cell>
                        <Table.Cell className="px-4 py-4 text-xs font-semibold">
                          {order.sourceChannel}
                        </Table.Cell>
                        <Table.Cell className="px-4 py-4">
                          <OrderStatusBadge status={order.status} />
                        </Table.Cell>
                        <Table.Cell className="px-4 py-4">
                          <OrderStatusBadge status={order.paymentStatus} />
                        </Table.Cell>
                        <Table.Cell className="px-4 py-4">
                          <OrderStatusBadge status={order.fulfillmentStatus} />
                        </Table.Cell>
                        <Table.Cell className="px-4 py-4 text-right font-semibold">
                          {formatCurrency(order.totalAmount, order.currency)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
              <Table.Footer>
                <Pagination size="sm">
                  <Pagination.Summary className="text-xs text-muted">
                    {ordersQuery.data.meta.total} total orders
                  </Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={!ordersQuery.data.meta.hasPrev}
                        onPress={() =>
                          setFilters((current) => ({
                            ...current,
                            page: current.page - 1,
                          }))
                        }
                      >
                        <Pagination.PreviousIcon />
                        Prev
                      </Pagination.Previous>
                    </Pagination.Item>
                    <Pagination.Item>
                      <span className="px-2 text-xs text-muted">
                        Page {ordersQuery.data.meta.page} of{" "}
                        {Math.max(ordersQuery.data.meta.totalPages, 1)}
                      </span>
                    </Pagination.Item>
                    <Pagination.Item>
                      <Pagination.Next
                        isDisabled={!ordersQuery.data.meta.hasNext}
                        onPress={() =>
                          setFilters((current) => ({
                            ...current,
                            page: current.page + 1,
                          }))
                        }
                      >
                        Next
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </Table.Footer>
            </Table>
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
    <Select
      className="w-full"
      value={value}
      variant="secondary"
      onChange={(nextValue) => {
        if (typeof nextValue === "string") onChange(nextValue);
      }}
    >
      <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      <Select.Trigger className="h-11 rounded-xl border border-separator bg-background px-3 text-sm shadow-none">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="rounded-xl border border-separator bg-surface p-1 shadow-xl">
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              className="rounded-lg px-3 py-2 text-sm outline-none transition hover:bg-surface-secondary data-[focused=true]:bg-surface-secondary"
              id={option}
              key={option}
              textValue={option.replaceAll("_", " ")}
            >
              <span>{option.replaceAll("_", " ")}</span>
              <ListBox.ItemIndicator className="text-accent" />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
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
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Input
        variant="secondary"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
        className="mt-4"
        type="button"
        variant="primary"
        onPress={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
