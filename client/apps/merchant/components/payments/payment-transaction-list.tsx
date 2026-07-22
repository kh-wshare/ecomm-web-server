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

import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { Select as FilterControlSelect } from '@/components/products/product-controls';
import type {
  PaymentFilters,
  PaymentProviderCode,
  PaymentTransactionStatus,
} from '@repo/types';
import { usePayments } from '@/hooks/api/use-payments';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCurrency } from '@/lib/formatters/currency';
import { formatDate } from '@/lib/formatters/date';

const initialFilters: PaymentFilters = {
  search: '',
  provider: 'ALL',
  status: 'ALL',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 15,
};

export function PaymentTransactionList() {
  const { can } = usePermissions();
  const canRead = can('payments.manage');
  const canManageProviders = can('payments.manage');
  const [filters, setFilters] = useState(initialFilters);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const queryFilters = { ...filters, search: deferredSearch };
  const paymentsQuery = usePayments(queryFilters, canRead);
  const paymentMeta = paymentsQuery.data?.meta;
  const payments = paymentsQuery.data?.items ?? [];
  const update = <Key extends keyof PaymentFilters>(
    key: Key,
    value: PaymentFilters[Key],
  ) => setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to view payment transactions.
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Payments</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Transactions
          </h2>
          <p className="mt-2 text-sm text-muted">
            Trace payment attempts back to their orders and webhook events.
          </p>
        </div>
        {canManageProviders && (
          <Link href="/payments/providers">
            <Button type="button" variant="secondary">
              Provider settings
            </Button>
          </Link>
        )}
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="sm:col-span-2">
          <SearchField name="search" value={filters.search}>
            <Label>Transaction or order</Label>
            <SearchField.Group className="bg-surface-secondary shadow-none">
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="Search transaction ID or order"
                value={filters.search}
                onChange={(event) => update('search', event.target.value)}
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
        <SelectField
          label="Provider"
          options={['ALL', 'HMAC', 'KHQR', 'ABA_PAYWAY']}
          value={filters.provider}
          onChange={(value) =>
            update('provider', value as PaymentProviderCode | 'ALL')
          }
        />
        <SelectField
          label="Status"
          options={['ALL', 'PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED']}
          value={filters.status}
          onChange={(value) =>
            update('status', value as PaymentTransactionStatus | 'ALL')
          }
        />
        <div className="grid grid-cols-2 gap-2">
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
              aria-label="Payment transactions"
              className="table-fixed text-left text-sm"
              selectionMode="none"
            >
              <Table.Header className="text-xs font-semibold text-muted">
                <Table.Column
                  className="w-[260px] px-4 py-3 font-medium rounded-b-none"
                  id="transaction"
                  isRowHeader
                >
                  Transaction
                </Table.Column>
                <Table.Column
                  className="w-[160px] px-4 py-3 font-medium"
                  id="order"
                >
                  Order
                </Table.Column>
                <Table.Column
                  className="w-[130px] px-4 py-3 font-medium"
                  id="provider"
                >
                  Provider
                </Table.Column>
                <Table.Column
                  className="w-[130px] px-4 py-3 font-medium"
                  id="status"
                >
                  Status
                </Table.Column>
                <Table.Column
                  className="w-[140px] px-4 py-3 font-medium"
                  id="created"
                >
                  Created
                </Table.Column>
                <Table.Column
                  className="w-[140px] px-4 py-3 text-right font-medium rounded-b-none"
                  id="amount"
                >
                  Amount
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => {
                  if (paymentsQuery.isPending) {
                    return <Loading label="Loading transactions" />;
                  }
                  if (paymentsQuery.isError) {
                    return (
                      <ErrorState
                        message={paymentsQuery.error.message}
                        onRetry={() => paymentsQuery.refetch()}
                      />
                    );
                  }
                  return <PaymentEmptyState />;
                }}
              >
                {payments.map((payment) => (
                  <Table.Row
                    className="border-t border-separator hover:bg-surface-secondary/60"
                    id={payment.id}
                    key={payment.id}
                  >
                    <Table.Cell className="px-4 py-4">
                      <Link
                        className="font-mono text-xs font-semibold hover:text-accent"
                        href={`/payments/transactions/${payment.id}`}
                      >
                        {payment.providerTransactionId}
                      </Link>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <Link
                        className="font-semibold hover:text-accent"
                        href={`/orders/${payment.order.id}`}
                      >
                        {payment.order.orderNumber}
                      </Link>
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4 text-xs font-semibold">
                      {payment.provider}
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4">
                      <OrderStatusBadge status={payment.status} />
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4 text-xs text-muted">
                      {formatDate(payment.createdAt)}
                    </Table.Cell>
                    <Table.Cell className="px-4 py-4 text-right font-semibold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {paymentMeta && payments.length ? (
            <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary className="text-xs text-muted">
                  {paymentMeta.total} total transactions
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={!paymentMeta.hasPrev}
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
                      Page {paymentMeta.page} of{' '}
                      {Math.max(paymentMeta.totalPages, 1)}
                    </span>
                  </Pagination.Item>
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={!paymentMeta.hasNext}
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

function SelectField({
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

function PaymentEmptyState() {
  return (
    <TableStateContent>
      <Icon className="size-6 text-muted" icon="gravity-ui:tray" />
      <span className="text-sm font-semibold">No transactions found</span>
      <span className="max-w-sm text-xs text-muted">
        Payment attempts will appear here after checkout.
      </span>
    </TableStateContent>
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
      <span className="text-sm font-semibold">
        Transactions are unavailable
      </span>
      <span className="max-w-sm text-xs text-muted">{message}</span>
      <Button type="button" variant="primary" onPress={onRetry}>
        Try again
      </Button>
    </TableStateContent>
  );
}
