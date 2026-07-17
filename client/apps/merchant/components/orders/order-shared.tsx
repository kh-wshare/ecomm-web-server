import Link from "next/link";
import { Button, Table } from "@heroui/react";

import type { Order, OrderItem, OrderTimelineEvent } from "@/types/order";
import { DateTimeText, MoneyText } from "@repo/ui";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";

export type OrderStatusAction =
  | "CANCEL"
  | "FULFILLED"
  | "PROCESSING"
  | "REFUND";

export function OrderTimeline({ events }: { events: OrderTimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-muted">No order events recorded.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li className="flex gap-3" key={event.id}>
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
          <div>
            <p className="text-sm font-semibold">{humanize(event.action)}</p>
            <p className="mt-1 text-xs text-muted">
              <DateTimeText value={event.createdAt} />
              {event.user?.fullName ? ` · ${event.user.fullName}` : " · System"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OrderItemList({
  currency,
  items,
}: {
  currency: string;
  items: OrderItem[];
}) {
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Order items"
          className="min-w-[620px] text-left text-sm"
          selectionMode="none"
        >
          <Table.Header className="text-xs font-semibold text-muted">
            <Table.Column className="pb-3 font-medium" id="product" isRowHeader>
              Product
            </Table.Column>
            <Table.Column className="pb-3 font-medium" id="sku">
              SKU
            </Table.Column>
            <Table.Column className="pb-3 text-right font-medium" id="price">
              Price
            </Table.Column>
            <Table.Column className="pb-3 text-right font-medium" id="quantity">
              Qty
            </Table.Column>
            <Table.Column className="pb-3 text-right font-medium" id="total">
              Total
            </Table.Column>
          </Table.Header>
          <Table.Body>
            {items.map((item) => (
              <Table.Row
                className="border-t border-separator"
                id={item.id}
                key={item.id}
              >
                <Table.Cell className="py-4">
                  <Link
                    className="font-semibold hover:text-accent"
                    href={`/products/${item.productId}`}
                  >
                    {item.name}
                  </Link>
                </Table.Cell>
                <Table.Cell className="py-4 font-mono text-xs">
                  {item.sku}
                </Table.Cell>
                <Table.Cell className="py-4 text-right">
                  <MoneyText amount={item.unitPrice} currency={currency} />
                </Table.Cell>
                <Table.Cell className="py-4 text-right">
                  {item.quantity}
                </Table.Cell>
                <Table.Cell className="py-4 text-right font-semibold">
                  <MoneyText amount={item.totalPrice} currency={currency} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export function OrderStatusActions({
  canCancel,
  canRefund,
  canUpdate,
  onAction,
  order,
}: {
  canCancel: boolean;
  canRefund: boolean;
  canUpdate: boolean;
  onAction: (action: OrderStatusAction) => void;
  order: Order;
}) {
  const actions: Array<{
    action: OrderStatusAction;
    danger?: boolean;
    label: string;
    visible: boolean;
  }> = [
    {
      action: "PROCESSING",
      label: "Mark processing",
      visible: canUpdate && order.status === "PAID",
    },
    {
      action: "FULFILLED",
      label: "Mark fulfilled",
      visible: canUpdate && order.status === "PROCESSING",
    },
    {
      action: "CANCEL",
      danger: true,
      label: "Cancel order",
      visible:
        canCancel &&
        order.paymentStatus !== "PAID" &&
        !["CANCELLED", "REFUNDED", "COMPLETED", "FULFILLED"].includes(
          order.status,
        ),
    },
    {
      action: "REFUND",
      danger: true,
      label: "Refund order",
      visible: canRefund && order.paymentStatus === "PAID",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions
        .filter((item) => item.visible)
        .map((item) => (
          <Button
            key={item.action}
            type="button"
            variant={item.danger ? "danger-soft" : "primary"}
            onPress={() => onAction(item.action)}
          >
            {item.label}
          </Button>
        ))}
    </div>
  );
}

export function PaymentSummaryCard({ order }: { order: Order }) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Payment</h3>
        <OrderStatusBadge status={order.paymentStatus} />
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Amount</dt>
          <dd className="font-semibold">
            <MoneyText amount={order.totalAmount} currency={order.currency} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Provider</dt>
          <dd>{order.payment?.provider ?? "Not assigned"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Paid</dt>
          <dd>
            <DateTimeText value={order.paidAt} />
          </dd>
        </div>
      </dl>
      {order.payment && (
        <Link
          className="mt-5 inline-flex text-sm font-semibold text-accent"
          href={`/payments/transactions/${order.payment.id}`}
        >
          View transaction →
        </Link>
      )}
    </section>
  );
}

function humanize(value: string) {
  return value
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
