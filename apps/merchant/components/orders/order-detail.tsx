"use client";

import { useState } from "react";
import { Button, Checkbox, Input, Table } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { OrderStatusBadge } from "./order-status-badge";

import type { Order } from "@/types/order";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";
import {
  cancelOrder,
  getOrder,
  refundOrder,
  updateOrderStatus,
} from "@/lib/orders/order-data";
import { queryKeys } from "@repo/query-client";
import { notify } from "@/lib/toast/notify";

type OrderAction = "PROCESSING" | "FULFILLED" | "CANCEL" | "REFUND";

export function OrderDetail({ orderId }: { orderId: string }) {
  const { can } = usePermissions();
  const canRead = can("orders.read");
  const canUpdate = can("orders.update");
  const canCancel = can("orders.update");
  const canRefund = can("payments.manage");
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<OrderAction | null>(null);
  const [returnStock, setReturnStock] = useState(true);
  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: canRead,
  });
  const actionMutation = useMutation({
    mutationFn: async (action: OrderAction) => {
      if (action === "CANCEL") return cancelOrder(orderId);
      if (action === "REFUND") return refundOrder(orderId, returnStock);

      return updateOrderStatus(orderId, action);
    },
    onSuccess: async (_, action) => {
      notify.success(actionSuccess(action));
      setConfirming(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(orderId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.merchant.dashboard(),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ]);
    },
    onError: (error) => notify.error(error, "Unable to update order"),
  });

  if (!canRead) {
    return (
      <Notice message="You do not have permission to view order details." />
    );
  }
  if (orderQuery.isPending) return <DetailLoading />;
  if (orderQuery.isError) {
    return (
      <ErrorState
        message={orderQuery.error.message}
        onRetry={() => orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-accent hover:underline"
            href="/orders"
          >
            ← Orders
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              {order.orderNumber}
            </h2>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            Placed through {order.sourceChannel.toLowerCase()} on{" "}
            {formatDate(
              order.createdAt,
              { dateStyle: "long", timeStyle: "short" },
              "en-US",
            )}
          </p>
        </div>
        <OrderActions
          canCancel={canCancel}
          canRefund={canRefund}
          canUpdate={canUpdate}
          order={order}
          onAction={setConfirming}
        />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total"
          value={formatCurrency(order.totalAmount, order.currency)}
        />
        <SummaryCard label="Payment" value={order.paymentStatus} />
        <SummaryCard label="Fulfillment" value={order.fulfillmentStatus} />
        <SummaryCard
          label="Items"
          value={String(
            order.items.reduce((total, item) => total + item.quantity, 0),
          )}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Ordered items">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content
                  aria-label="Ordered items"
                  className="min-w-[620px] text-left text-sm"
                  selectionMode="none"
                >
                  <Table.Header className="text-xs font-semibold text-muted">
                    <Table.Column
                      className="pb-3 font-medium"
                      id="product"
                      isRowHeader
                    >
                      Product
                    </Table.Column>
                    <Table.Column className="pb-3 font-medium" id="sku">
                      SKU
                    </Table.Column>
                    <Table.Column
                      className="pb-3 text-right font-medium"
                      id="price"
                    >
                      Price
                    </Table.Column>
                    <Table.Column
                      className="pb-3 text-right font-medium"
                      id="quantity"
                    >
                      Qty
                    </Table.Column>
                    <Table.Column
                      className="pb-3 text-right font-medium"
                      id="total"
                    >
                      Total
                    </Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {order.items.map((item) => (
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
                          <p className="mt-1 text-xs text-muted">
                            {item.variantId
                              ? "Product variant"
                              : "Base product"}
                          </p>
                        </Table.Cell>
                        <Table.Cell className="py-4 font-mono text-xs">
                          {item.sku}
                        </Table.Cell>
                        <Table.Cell className="py-4 text-right">
                          {formatCurrency(item.unitPrice, order.currency)}
                        </Table.Cell>
                        <Table.Cell className="py-4 text-right">
                          {item.quantity}
                        </Table.Cell>
                        <Table.Cell className="py-4 text-right font-semibold">
                          {formatCurrency(item.totalPrice, order.currency)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
            <dl className="ml-auto mt-4 max-w-xs space-y-2 border-t border-separator pt-4 text-sm">
              <AmountRow
                label="Subtotal"
                value={formatCurrency(order.subtotalAmount, order.currency)}
              />
              <AmountRow
                label="Discount"
                value={formatCurrency(order.discountAmount, order.currency)}
              />
              <AmountRow
                label="Fees"
                value={formatCurrency(order.feeAmount, order.currency)}
              />
              <AmountRow
                strong
                label="Total"
                value={formatCurrency(order.totalAmount, order.currency)}
              />
            </dl>
          </Panel>

          <Panel title="Order timeline">
            {order.timeline?.length ? (
              <ol className="space-y-4">
                {order.timeline.map((event) => (
                  <li className="flex gap-3" key={event.id}>
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <p className="text-sm font-semibold">
                        {timelineLabel(event.action)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(event.createdAt)}
                        {event.user?.fullName
                          ? ` · ${event.user.fullName}`
                          : " · System"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">
                No order events have been recorded.
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <dl className="space-y-4">
              <DetailTerm
                label="Name"
                value={order.customerName || "Guest customer"}
              />
              <DetailTerm
                label="Email"
                value={order.customerEmail || "Not provided"}
              />
              <DetailTerm
                label="Phone"
                value={order.customerPhone || "Not provided"}
              />
            </dl>
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-4">
              <DetailTerm label="Status" value={order.paymentStatus} />
              <DetailTerm
                label="Paid"
                value={order.paidAt ? formatDate(order.paidAt) : "Not paid"}
              />
              <DetailTerm
                label="Amount"
                value={formatCurrency(order.totalAmount, order.currency)}
              />
            </dl>
            {order.payment && (
              <Link
                className="mt-5 inline-flex text-sm font-semibold text-accent hover:underline"
                href={`/payments/transactions/${order.payment.id}`}
              >
                View transaction →
              </Link>
            )}
          </Panel>

          <Panel title="Fulfillment">
            <dl className="space-y-4">
              <DetailTerm label="Status" value={order.fulfillmentStatus} />
              <DetailTerm
                label="Fulfilled"
                value={
                  order.fulfilledAt
                    ? formatDate(order.fulfilledAt)
                    : "Not fulfilled"
                }
              />
            </dl>
          </Panel>

          <Panel title="Order notes">
            <p className="text-sm text-muted">
              No internal notes have been recorded for this order.
            </p>
          </Panel>
        </div>
      </div>

      {confirming && (
        <ConfirmationDialog
          action={confirming}
          isPending={actionMutation.isPending}
          returnStock={returnStock}
          onClose={() => setConfirming(null)}
          onConfirm={() => actionMutation.mutate(confirming)}
          onReturnStock={setReturnStock}
        />
      )}
    </section>
  );
}

function OrderActions({
  canCancel,
  canRefund,
  canUpdate,
  onAction,
  order,
}: {
  canCancel: boolean;
  canRefund: boolean;
  canUpdate: boolean;
  onAction: (action: OrderAction) => void;
  order: Order;
}) {
  const actions: Array<{
    action: OrderAction;
    label: string;
    visible: boolean;
    danger?: boolean;
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
      label: "Cancel order",
      danger: true,
      visible:
        canCancel &&
        order.paymentStatus !== "PAID" &&
        !["CANCELLED", "REFUNDED", "COMPLETED", "FULFILLED"].includes(
          order.status,
        ),
    },
    {
      action: "REFUND",
      label: "Refund order",
      danger: true,
      visible: canRefund && order.paymentStatus === "PAID",
    },
  ];
  const visible = actions.filter((action) => action.visible);

  if (!visible.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((item) => (
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

function ConfirmationDialog({
  action,
  isPending,
  onClose,
  onConfirm,
  onReturnStock,
  returnStock,
}: {
  action: OrderAction;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReturnStock: (value: boolean) => void;
  returnStock: boolean;
}) {
  const label = action.toLowerCase().replace("_", " ");

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-separator bg-surface p-5 shadow-2xl">
        <h2 className="text-lg font-semibold">Confirm {label}</h2>
        <p className="mt-2 text-sm text-muted">
          This changes the order state immediately and records the action in its
          timeline.
        </p>
        {action === "REFUND" && (
          <label className="mt-4 flex items-center gap-3 rounded-xl bg-surface-secondary p-3 text-sm">
            <Checkbox isSelected={returnStock} onChange={onReturnStock}>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
            Return refunded items to available stock
          </label>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button
            isDisabled={isPending}
            type="button"
            variant="secondary"
            onPress={onClose}
          >
            Keep order
          </Button>
          <Button
            isDisabled={isPending}
            type="button"
            variant="primary"
            onPress={onConfirm}
          >
            {isPending ? "Updating…" : `Confirm ${label}`}
          </Button>
        </div>
      </div>
    </div>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-separator bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value.replaceAll("_", " ")}</p>
    </div>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">
        {value.replaceAll("_", " ")}
      </dd>
    </div>
  );
}

function AmountRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className={`flex justify-between ${strong ? "font-bold" : ""}`}>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function timelineLabel(action: string) {
  return action
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function actionSuccess(action: OrderAction) {
  if (action === "CANCEL") return "Order cancelled";
  if (action === "REFUND") return "Order refunded";
  if (action === "PROCESSING") return "Order marked as processing";

  return "Order marked as fulfilled";
}

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
      {message}
    </div>
  );
}

function DetailLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 rounded-2xl bg-surface-secondary" />
      <div className="h-[540px] rounded-2xl bg-surface-secondary" />
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
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <h2 className="text-xl font-semibold">Order is unavailable</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <Button
          className="mt-5"
          type="button"
          variant="primary"
          onPress={onRetry}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
