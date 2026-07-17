"use client";

import { Button, Table } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";
import { getPayment } from "@/lib/payments/payment-data";
import { queryKeys } from "@repo/query-client";

export function PaymentDetail({ paymentId }: { paymentId: string }) {
  const { can } = usePermissions();
  const canRead = can("payments.manage");
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
            className="mt-5"
            type="button"
            variant="primary"
            onPress={() => paymentQuery.refetch()}
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
          href="/payments/transactions"
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
            href={`/orders/${payment.order.id}`}
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
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Webhook logs"
                className="min-w-[760px] text-left text-sm"
                selectionMode="none"
              >
                <Table.Header className="text-xs font-semibold text-muted">
                  <Table.Column
                    className="pb-3 font-medium"
                    id="event"
                    isRowHeader
                  >
                    Event ID
                  </Table.Column>
                  <Table.Column className="pb-3 font-medium" id="status">
                    Status
                  </Table.Column>
                  <Table.Column className="pb-3 font-medium" id="received">
                    Received
                  </Table.Column>
                  <Table.Column className="pb-3 font-medium" id="processed">
                    Processed
                  </Table.Column>
                  <Table.Column className="pb-3 font-medium" id="error">
                    Error
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {payment.webhookEvents.map((event) => (
                    <Table.Row
                      className="border-t border-separator"
                      id={event.id}
                      key={event.id}
                    >
                      <Table.Cell className="py-4 font-mono text-xs">
                        {event.eventId}
                      </Table.Cell>
                      <Table.Cell className="py-4">
                        <OrderStatusBadge status={event.status} />
                      </Table.Cell>
                      <Table.Cell className="py-4 text-xs text-muted">
                        {formatDate(event.createdAt)}
                      </Table.Cell>
                      <Table.Cell className="py-4 text-xs text-muted">
                        {event.processedAt
                          ? formatDate(event.processedAt)
                          : "Pending"}
                      </Table.Cell>
                      <Table.Cell className="max-w-xs py-4 text-xs text-danger">
                        {event.error || "—"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
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
