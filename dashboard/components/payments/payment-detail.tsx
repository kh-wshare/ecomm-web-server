"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/hero-controls";
import { Table } from "@/components/ui/hero-table";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";
import { getPayment } from "@/lib/payments/payment-data";
import { queryKeys } from "@/lib/query/keys";

export function PaymentDetail({ paymentId }: { paymentId: string }) {
  const { can } = usePermissions();
  const canRead = can("payment.read");
  const paymentQuery = useQuery({
    queryKey: queryKeys.payments.detail(paymentId),
    queryFn: () => getPayment(paymentId),
    enabled: canRead,
  });

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to view payment details.
      </div>
    );
  }
  if (paymentQuery.isPending) {
    return (
      <div className="h-[560px] animate-pulse rounded-2xl bg-surface-secondary" />
    );
  }
  if (paymentQuery.isError) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        <div>
          <h2 className="text-xl font-semibold">Payment is unavailable</h2>
          <p className="mt-2 text-sm text-muted">
            {paymentQuery.error.message}
          </p>
          <Button
            className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            type="button"
            onClick={() => paymentQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const payment = paymentQuery.data;

  return (
    <section className="space-y-6">
      <header>
        <Link
          className="text-sm font-medium text-accent hover:underline"
          href="/dashboard/payments/transactions"
        >
          ← Transactions
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Payment detail
          </h2>
          <OrderStatusBadge status={payment.status} />
        </div>
        <p className="mt-2 break-all font-mono text-xs text-muted">
          {payment.providerTransactionId}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          label="Amount"
          value={formatCurrency(payment.amount, payment.currency)}
        />
        <Summary label="Provider" value={payment.provider} />
        <Summary label="Status" value={payment.status} />
        <Summary
          label="Paid"
          value={payment.paidAt ? formatDate(payment.paidAt) : "Not paid"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Transaction">
          <dl className="space-y-5">
            <Term
              label="Provider transaction ID"
              value={payment.providerTransactionId}
            />
            <Term label="Internal payment ID" value={payment.id} />
            <Term
              label="Created"
              value={formatDate(payment.createdAt, {
                dateStyle: "long",
                timeStyle: "long",
              })}
            />
            <Term label="Currency" value={payment.currency} />
          </dl>
        </Panel>

        <Panel title="Related order">
          <p className="text-sm text-muted">
            This transaction belongs to merchant order:
          </p>
          <Link
            className="mt-4 inline-flex text-lg font-semibold text-accent hover:underline"
            href={`/dashboard/orders/${payment.order.id}`}
          >
            {payment.order.orderNumber} →
          </Link>
          {payment.order.status && (
            <div className="mt-4 flex flex-wrap gap-2">
              <OrderStatusBadge status={payment.order.status} />
              {payment.order.paymentStatus && (
                <OrderStatusBadge status={payment.order.paymentStatus} />
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Webhook logs">
        {payment.webhookEvents?.length ? (
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-3 font-medium">Event ID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Received</th>
                  <th className="pb-3 font-medium">Processed</th>
                  <th className="pb-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {payment.webhookEvents.map((event) => (
                  <tr className="border-t border-separator" key={event.id}>
                    <td className="py-4 font-mono text-xs">{event.eventId}</td>
                    <td className="py-4">
                      <OrderStatusBadge status={event.status} />
                    </td>
                    <td className="py-4 text-xs text-muted">
                      {formatDate(event.createdAt)}
                    </td>
                    <td className="py-4 text-xs text-muted">
                      {event.processedAt
                        ? formatDate(event.processedAt)
                        : "Pending"}
                    </td>
                    <td className="max-w-xs py-4 text-xs text-danger">
                      {event.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No webhook events have been received for this transaction.
          </p>
        )}
      </Panel>
    </section>
  );
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <h3 className="mb-5 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-separator bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold">
        {value.replaceAll("_", " ")}
      </p>
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium">{value}</dd>
    </div>
  );
}
