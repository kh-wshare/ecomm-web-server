"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button, Input, Select } from "@/components/ui/hero-controls";
import { Table } from "@/components/ui/hero-table";
import type {
  PaymentFilters,
  PaymentProviderCode,
  PaymentTransactionStatus,
} from "@/types/payment";
import { usePayments } from "@/hooks/api/use-payments";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";

const initialFilters: PaymentFilters = {
  search: "",
  provider: "ALL",
  status: "ALL",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 15,
};

export function PaymentTransactionList() {
  const { can } = usePermissions();
  const canRead = can("payment.read");
  const canManageProviders = can("payment.provider_manage");
  const [filters, setFilters] = useState(initialFilters);
  const deferredSearch = useDeferredValue(filters.search.trim());
  const queryFilters = { ...filters, search: deferredSearch };
  const paymentsQuery = usePayments(queryFilters, canRead);
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
          <Link
            className="inline-flex h-10 items-center rounded-xl border border-separator px-4 text-sm font-semibold"
            href="/dashboard/payments/providers"
          >
            Provider settings
          </Link>
        )}
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">
            Transaction or order
          </span>
          <Input
            className="h-10 w-full rounded-xl border border-separator bg-background px-3 text-sm"
            placeholder="Search transaction ID or order"
            type="search"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
          />
        </label>
        <SelectField
          label="Provider"
          options={["ALL", "HMAC"]}
          value={filters.provider}
          onChange={(value) =>
            update("provider", value as PaymentProviderCode | "ALL")
          }
        />
        <SelectField
          label="Status"
          options={["ALL", "PENDING", "CONFIRMED", "FAILED", "REFUNDED"]}
          value={filters.status}
          onChange={(value) =>
            update("status", value as PaymentTransactionStatus | "ALL")
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
        {paymentsQuery.isPending ? (
          <div className="h-[440px] animate-pulse bg-surface-secondary/50" />
        ) : paymentsQuery.isError ? (
          <ErrorState
            message={paymentsQuery.error.message}
            onRetry={() => paymentsQuery.refetch()}
          />
        ) : paymentsQuery.data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-surface-secondary text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Transaction</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsQuery.data.items.map((payment) => (
                    <tr
                      className="border-t border-separator hover:bg-surface-secondary/60"
                      key={payment.id}
                    >
                      <td className="px-4 py-4">
                        <Link
                          className="font-mono text-xs font-semibold hover:text-accent"
                          href={`/dashboard/payments/transactions/${payment.id}`}
                        >
                          {payment.providerTransactionId}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          className="font-semibold hover:text-accent"
                          href={`/dashboard/orders/${payment.order.id}`}
                        >
                          {payment.order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold">
                        {payment.provider}
                      </td>
                      <td className="px-4 py-4">
                        <OrderStatusBadge status={payment.status} />
                      </td>
                      <td className="px-4 py-4 text-xs text-muted">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t border-separator px-4 py-3">
              <p className="text-xs text-muted">
                {paymentsQuery.data.meta.total} total transactions
              </p>
              <div className="flex items-center gap-3">
                <PageButton
                  disabled={!paymentsQuery.data.meta.hasPrev}
                  label="Previous"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                />
                <span className="text-xs text-muted">
                  Page {paymentsQuery.data.meta.page} of{" "}
                  {Math.max(paymentsQuery.data.meta.totalPages, 1)}
                </span>
                <PageButton
                  disabled={!paymentsQuery.data.meta.hasNext}
                  label="Next"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No transactions found</p>
            <p className="mt-1 text-sm text-muted">
              Payment attempts will appear here after checkout.
            </p>
          </div>
        )}
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
    <label>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Select
        className="h-10 w-full rounded-xl border border-separator bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-semibold">Transactions are unavailable</p>
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
