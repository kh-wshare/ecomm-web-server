'use client';

import { type ReactNode, useDeferredValue, useState } from 'react';
import {
  Button,
  EmptyState as HeroEmptyState,
  Input,
  Label,
  Pagination,
  SearchField,
  Table,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import Link from 'next/link';

import { OrderStatusBadge } from './order-status-badge';
import { Select as FilterControlSelect } from '@/components/products/product-controls';

import type {
  FulfillmentStatus,
  OrderFilters,
  PaymentStatus,
  SalesChannel,
} from '@/types/order';
import { useOrders } from '@/hooks/api/use-orders';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatDate } from '@/lib/formatters/date';

const initialFilters: OrderFilters = {
  search: '',
  paymentStatus: 'ALL',
  fulfillmentStatus: 'ALL',
  sourceChannel: 'ALL',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 15,
};

export function OrderTable() {
  const { can } = usePermissions();
  const canRead = can('orders.read');
  const [filters, setFilters] = useState(initialFilters);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const queryFilters = { ...filters, search: deferredSearch };
  const ordersQuery = useOrders(queryFilters, canRead);
  const orders = ordersQuery.data?.items ?? [];
  const orderMeta = ordersQuery.data?.meta;
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
            <Label>Search</Label>
            <SearchField.Group className="bg-surface-secondary shadow-none">
              <SearchField.SearchIcon />
              <SearchField.Input
                className="text-muted"
                value={filters.search}
                onChange={(event) => update('search', event.target.value)}
                placeholder="Search order number, name, or email"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
        <div className="col-span-2 flex gap-3">
          <FilterSelect
            label="Payment"
            value={filters.paymentStatus}
            options={['ALL', 'PENDING', 'PAID', 'FAILED', 'REFUNDED']}
            onChange={(value) =>
              update('paymentStatus', value as PaymentStatus | 'ALL')
            }
          />
          <FilterSelect
            label="Fulfillment"
            value={filters.fulfillmentStatus}
            options={[
              'ALL',
              'UNFULFILLED',
              'PROCESSING',
              'FULFILLED',
              'CANCELLED',
            ]}
            onChange={(value) =>
              update('fulfillmentStatus', value as FulfillmentStatus | 'ALL')
            }
          />
          <FilterSelect
            label="Channel"
            value={filters.sourceChannel}
            options={[
              'ALL',
              'POS',
              'WEBSITE',
              'FACEBOOK',
              'INSTAGRAM',
              'TIKTOK',
            ]}
            onChange={(value) =>
              update('sourceChannel', value as SalesChannel | 'ALL')
            }
          />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-2">
          <DateField
            label="From"
            value={filters.dateFrom}
            onChange={(value) => update('dateFrom', value)}
          />
          <DateField
            label="To"
            value={filters.dateTo}
            onChange={(value) => update('dateTo', value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm">
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Orders"
              className="h-full table-fixed text-left text-sm"
              selectionMode="none"
            >
              <Table.Header className="text-xs font-semibold text-muted">
                <Table.Column
                  className="w-[180px] px-4 py-3 font-medium rounded-b-none"
                  id="order"
                  isRowHeader
                >
                  Order
                </Table.Column>
                <Table.Column
                  className="w-[220px] px-4 py-3 font-medium"
                  id="customer"
                >
                  Customer
                </Table.Column>
                <Table.Column
                  className="w-[120px] px-4 py-3 font-medium"
                  id="channel"
                >
                  Channel
                </Table.Column>
                <Table.Column
                  className="w-[140px] px-4 py-3 font-medium"
                  id="status"
                >
                  Order status
                </Table.Column>
                <Table.Column
                  className="w-[130px] px-4 py-3 font-medium"
                  id="payment"
                >
                  Payment
                </Table.Column>
                <Table.Column
                  className="w-[150px] px-4 py-3 font-medium"
                  id="fulfillment"
                >
                  Fulfillment
                </Table.Column>
                <Table.Column
                  className="w-[140px] px-4 py-3 text-right font-medium rounded-b-none"
                  id="total"
                >
                  Total
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => {
                  if (ordersQuery.isPending) {
                    return <Loading label="Loading orders" />;
                  }
                  if (ordersQuery.isError) {
                    return (
                      <ErrorState
                        message={ordersQuery.error.message}
                        onRetry={() => ordersQuery.refetch()}
                      />
                    );
                  }
                  return <OrderEmptyState />;
                }}
              >
                {orders.map((order) => (
                  <Table.Row
                    className="border-t border-separator hover:bg-surface-secondary/60"
                    id={order.id}
                    key={order.id}
                  >
                    <Table.Cell className="px-4 py-4">
                      <Link
                        className="font-semibold hover:text-accent"
                        href={`/orders/${order.id}`}
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(
                          order.createdAt,
                          { dateStyle: 'medium', timeStyle: 'short' },
                          'en-US',
                        )}
                      </p>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <p className="font-medium">
                        {order.customerName || 'Guest customer'}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {order.customerEmail || 'No email'}
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
          {orderMeta && orders.length ? (
            <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary className="text-xs text-muted">
                  {orderMeta.total} total orders
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={!orderMeta.hasPrev}
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
                      Page {orderMeta.page} of{' '}
                      {Math.max(orderMeta.totalPages, 1)}
                    </span>
                  </Pagination.Item>
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={!orderMeta.hasNext}
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
          ) : null}
        </Table>
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
    <FilterControlSelect
      className="text-muted"
      label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {formatOption(option)}
        </option>
      ))}
    </FilterControlSelect>
  );
}

function formatOption(option: string) {
  if (option === 'ALL') return 'All';
  return option
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
    <div className="flex flex-col gap-1">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        className="bg-surface-secondary text-muted"
        variant="secondary"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TableStateContent({ children }: { children: ReactNode }) {
  return (
    <HeroEmptyState className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-4 text-center md:min-h-[calc(100dvh-30rem)]">
      {children}
    </HeroEmptyState>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <TableStateContent>
      <Icon
        className="size-6 animate-spin text-muted"
        icon="gravity-ui:arrows-rotate-right"
      />
      <span className="text-sm text-muted">{label}</span>
    </TableStateContent>
  );
}

function OrderEmptyState() {
  return (
    <TableStateContent>
      <Icon className="size-6 text-muted" icon="gravity-ui:tray" />
      <span className="text-sm font-semibold">No orders found</span>
      <span className="max-w-sm text-xs text-muted">
        Try changing one of the filters.
      </span>
    </TableStateContent>
  );
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
    <TableStateContent>
      <Icon className="size-6 text-danger" icon="gravity-ui:circle-xmark" />
      <span className="text-sm font-semibold">Orders are unavailable</span>
      <span className="max-w-sm text-xs text-muted">{message}</span>
      <Button type="button" variant="primary" onPress={onRetry}>
        Try again
      </Button>
    </TableStateContent>
  );
}
