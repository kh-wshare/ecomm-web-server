import Link from "next/link";

import type { Order, OrderItem, OrderTimelineEvent } from "@/types/order";
import { DateTimeText, MoneyText } from "@/components/ui/display";
import { Button } from "@/components/ui/hero-controls";
import { Table } from "@/components/ui/hero-table";
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
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[620px] text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="pb-3 font-medium">Product</th>
            <th className="pb-3 font-medium">SKU</th>
            <th className="pb-3 text-right font-medium">Price</th>
            <th className="pb-3 text-right font-medium">Qty</th>
            <th className="pb-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t border-separator" key={item.id}>
              <td className="py-4">
                <Link
                  className="font-semibold hover:text-accent"
                  href={`/dashboard/products/${item.productId}`}
                >
                  {item.name}
                </Link>
              </td>
              <td className="py-4 font-mono text-xs">{item.sku}</td>
              <td className="py-4 text-right">
                <MoneyText amount={item.unitPrice} currency={currency} />
              </td>
              <td className="py-4 text-right">{item.quantity}</td>
              <td className="py-4 text-right font-semibold">
                <MoneyText amount={item.totalPrice} currency={currency} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
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
            className={
              item.danger
                ? "h-10 rounded-xl border border-danger/40 px-4 text-sm font-semibold text-danger"
                : "h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
            }
            key={item.action}
            type="button"
            onClick={() => onAction(item.action)}
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
          href={`/dashboard/payments/transactions/${order.payment.id}`}
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
