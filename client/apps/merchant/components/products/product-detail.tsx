"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Chip, Skeleton, Table } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProductStatusBadge } from "./product-status-badge";

import { Button } from "@repo/ui";
import type {
  Product,
  ProductInventoryDetail,
  ProductOrder,
} from "@/types/product";
import { ImageGallery } from "@/components/products/image-gallery";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getProduct,
  getProductInventory,
  getProductOrders,
} from "@/lib/products/product-data";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";
import { queryKeys } from "@repo/query-client";

export function ProductDetail({ productId }: { productId: string }) {
  const { can } = usePermissions();
  const canRead = can("products.read");
  const canEdit = can("products.update");
  const router = useRouter();
  const canReadInventory = can("inventory.read");
  const canReadOrders = can("orders.read");
  const productQuery = useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => getProduct(productId),
    enabled: canRead,
  });
  const inventoryQuery = useQuery({
    queryKey: queryKeys.inventory.detail(productId),
    queryFn: () => getProductInventory(productId),
    enabled: canRead && canReadInventory,
    retry: false,
  });
  const ordersQuery = useQuery({
    queryKey: [...queryKeys.orders.all, "product", productId],
    queryFn: () => getProductOrders(productId),
    enabled: canRead && canReadOrders,
    retry: false,
  });

  if (!canRead) {
    return (
      <Alert status="warning">
        <Alert.Content>
          <Alert.Title>Permission required</Alert.Title>
          <Alert.Description>
            You do not have permission to view product details.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (productQuery.isPending) return <ProductDetailLoading />;

  if (productQuery.isError) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Alert className="max-w-xl" status="danger">
          <Alert.Content>
            <Alert.Title>Product is unavailable</Alert.Title>
            <Alert.Description>{productQuery.error.message}</Alert.Description>
            <Button
              className="mt-4"
              size="sm"
              type="button"
              variant="danger"
              onPress={() => productQuery.refetch()}
            >
              Try again
            </Button>
          </Alert.Content>
        </Alert>
      </div>
    );
  }

  const product = productQuery.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-accent hover:underline"
            href="/products"
          >
            ← Products
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h2>
            <ProductStatusBadge status={product.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            SKU {product.sku} · Updated{" "}
            {formatDate(product.updatedAt, { dateStyle: "medium" }, "en-US")}
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="primary"
            onPress={() =>
              router.push(`/products/${product.id}/edit`)
            }
          >
            Edit product
          </Button>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Price"
          value={formatCurrency(product.price, product.currency)}
        />
        <SummaryCard
          label="Variants"
          value={(product.variants?.length ?? 0).toLocaleString()}
        />
        <SummaryCard
          label="Visible channels"
          value={String(
            product.channelVisibility?.filter((item) => item.isVisible)
              .length ?? 0,
          )}
        />
        <SummaryCard label="Slug" value={product.slug} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Overview product={product} />
          <SalesHistory
            allowed={canReadOrders}
            isLoading={ordersQuery.isPending}
            orders={ordersQuery.data}
            productId={product.id}
          />
          <StockHistory
            allowed={canReadInventory}
            inventory={inventoryQuery.data}
            isLoading={inventoryQuery.isPending}
          />
        </div>
        <div className="space-y-6">
          <ChannelVisibility product={product} />
          <ProductMedia product={product} />
        </div>
      </div>
    </section>
  );
}

function Overview({ product }: { product: Product }) {
  return (
    <DetailSection title="Product summary">
      <dl className="grid gap-5 sm:grid-cols-2">
        <DetailTerm label="Name" value={product.name} />
        <DetailTerm label="SKU" value={product.sku} />
        <DetailTerm
          label="Created"
          value={formatDate(product.createdAt, { dateStyle: "long" }, "en-US")}
        />
        <DetailTerm label="Currency" value={product.currency} />
      </dl>
      <div className="mt-5 border-t border-separator pt-5">
        <p className="text-xs font-medium text-muted">Description</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {product.description || "No product description."}
        </p>
      </div>
      <div className="mt-5 border-t border-separator pt-5">
        <p className="mb-3 text-xs font-medium text-muted">Variants</p>
        {product.variants?.length ? (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Product variants"
                className="min-w-[560px] text-left text-sm"
                selectionMode="none"
              >
                <Table.Header className="text-xs font-semibold text-muted">
                  <Table.Column
                    className="pb-3 font-medium"
                    id="name"
                    isRowHeader
                  >
                    Name
                  </Table.Column>
                  <Table.Column className="pb-3 font-medium" id="sku">
                    SKU
                  </Table.Column>
                  <Table.Column className="pb-3 font-medium" id="status">
                    Status
                  </Table.Column>
                  <Table.Column
                    className="pb-3 text-right font-medium"
                    id="price"
                  >
                    Price
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {product.variants.map((variant) => (
                    <Table.Row
                      className="border-t border-separator"
                      id={variant.id}
                      key={variant.id}
                    >
                      <Table.Cell className="py-3 font-medium">
                        {variant.name}
                      </Table.Cell>
                      <Table.Cell className="py-3 font-mono text-xs text-muted">
                        {variant.sku}
                      </Table.Cell>
                      <Table.Cell className="py-3">
                        <StatusChip status={variant.status} />
                      </Table.Cell>
                      <Table.Cell className="py-3 text-right font-semibold">
                        {formatCurrency(variant.price, product.currency)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        ) : (
          <p className="text-sm text-muted">No variants.</p>
        )}
      </div>
    </DetailSection>
  );
}

function SalesHistory({
  allowed,
  isLoading,
  orders,
  productId,
}: {
  allowed: boolean;
  isLoading: boolean;
  orders?: ProductOrder[];
  productId: string;
}) {
  return (
    <DetailSection title="Sales history">
      {!allowed ? (
        <Restricted message="Order permission is required to view sales." />
      ) : isLoading ? (
        <LoadingRows />
      ) : orders?.length ? (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Product sales history"
              className="min-w-[600px] text-left text-sm"
              selectionMode="none"
            >
              <Table.Header className="text-xs font-semibold text-muted">
                <Table.Column
                  className="pb-3 font-medium"
                  id="order"
                  isRowHeader
                >
                  Order
                </Table.Column>
                <Table.Column className="pb-3 font-medium" id="date">
                  Date
                </Table.Column>
                <Table.Column className="pb-3 font-medium" id="quantity">
                  Quantity
                </Table.Column>
                <Table.Column className="pb-3 font-medium" id="status">
                  Status
                </Table.Column>
                <Table.Column
                  className="pb-3 text-right font-medium"
                  id="revenue"
                >
                  Product revenue
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {orders.slice(0, 10).map((order) => {
                  const items = order.items.filter(
                    (item) => item.productId === productId,
                  );
                  const quantity = items.reduce(
                    (total, item) => total + item.quantity,
                    0,
                  );
                  const revenue = items.reduce(
                    (total, item) => total + Number(item.totalPrice),
                    0,
                  );

                  return (
                    <Table.Row
                      className="border-t border-separator"
                      id={order.id}
                      key={order.id}
                    >
                      <Table.Cell className="py-3 font-semibold">
                        {order.orderNumber}
                      </Table.Cell>
                      <Table.Cell className="py-3 text-muted">
                        {formatDate(
                          order.createdAt,
                          { dateStyle: "medium" },
                          "en-US",
                        )}
                      </Table.Cell>
                      <Table.Cell className="py-3">{quantity}</Table.Cell>
                      <Table.Cell className="py-3">
                        <StatusChip status={order.status} />
                      </Table.Cell>
                      <Table.Cell className="py-3 text-right font-semibold">
                        {formatCurrency(revenue, order.currency)}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : (
        <EmptyMessage message="No orders contain this product yet." />
      )}
    </DetailSection>
  );
}

function StockHistory({
  allowed,
  inventory,
  isLoading,
}: {
  allowed: boolean;
  inventory?: ProductInventoryDetail;
  isLoading: boolean;
}) {
  return (
    <DetailSection title="Stock movement history">
      {!allowed ? (
        <Restricted message="Inventory permission is required to view stock." />
      ) : isLoading ? (
        <LoadingRows />
      ) : inventory?.recentMovements.length ? (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Product stock movement history"
              className="min-w-[560px] text-left text-sm"
              selectionMode="none"
            >
              <Table.Header className="text-xs font-semibold text-muted">
                <Table.Column
                  className="pb-3 font-medium"
                  id="movement"
                  isRowHeader
                >
                  Movement
                </Table.Column>
                <Table.Column className="pb-3 font-medium" id="date">
                  Date
                </Table.Column>
                <Table.Column className="pb-3 font-medium" id="reference">
                  Reference
                </Table.Column>
                <Table.Column
                  className="pb-3 text-right font-medium"
                  id="quantity"
                >
                  Quantity
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {inventory.recentMovements.map((movement) => (
                  <Table.Row
                    className="border-t border-separator"
                    id={movement.id}
                    key={movement.id}
                  >
                    <Table.Cell className="py-3 font-semibold">
                      {toLabel(movement.type)}
                    </Table.Cell>
                    <Table.Cell className="py-3 text-muted">
                      {formatDate(
                        movement.createdAt,
                        { dateStyle: "medium", timeStyle: "short" },
                        "en-US",
                      )}
                    </Table.Cell>
                    <Table.Cell className="py-3 text-muted">
                      {movement.referenceType
                        ? toLabel(movement.referenceType)
                        : "Manual"}
                    </Table.Cell>
                    <Table.Cell
                      className={`py-3 text-right font-semibold ${
                        movement.quantity < 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      ) : (
        <EmptyMessage message="No stock movements recorded." />
      )}
    </DetailSection>
  );
}

function ChannelVisibility({ product }: { product: Product }) {
  return (
    <DetailSection title="Channel visibility">
      <div className="space-y-3">
        {product.channelVisibility?.length ? (
          product.channelVisibility.map((item) => (
            <Card
              className="flex-row items-center justify-between gap-3 p-3"
              variant="secondary"
              key={item.channel}
            >
              <p className="text-sm font-semibold">{toLabel(item.channel)}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Chip
                  color={item.isVisible ? "success" : "default"}
                  size="sm"
                  variant="soft"
                >
                  {item.isVisible ? "Visible" : "Hidden"}
                </Chip>
                <Chip
                  color={item.isPurchasable ? "accent" : "default"}
                  size="sm"
                  variant="soft"
                >
                  {item.isPurchasable ? "Purchasable" : "Not purchasable"}
                </Chip>
              </div>
            </Card>
          ))
        ) : (
          <EmptyMessage message="Not configured for any channel." />
        )}
      </div>
    </DetailSection>
  );
}

function ProductMedia({ product }: { product: Product }) {
  const media = product.media ?? [];

  return (
    <DetailSection title="Product media">
      {media.length ? (
        <ImageGallery media={media} />
      ) : (
        <EmptyMessage message="No product media." />
      )}
    </DetailSection>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="secondary">
      <Card.Content className="p-5">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-2 truncate text-xl font-semibold" title={value}>
          {value}
        </p>
      </Card.Content>
    </Card>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <Card.Header className="pb-0">
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Content className="p-5">{children}</Card.Content>
    </Card>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <Card variant="secondary">
      <Card.Content className="px-4 py-8 text-center text-sm text-muted">
        {message}
      </Card.Content>
    </Card>
  );
}

function Restricted({ message }: { message: string }) {
  return (
    <Alert status="warning">
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-10 rounded-lg" />
    </div>
  );
}

function ProductDetailLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-24 rounded-2xl" key={index} />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <Chip color={statusColor(status)} size="sm" variant="soft">
      {toLabel(status)}
    </Chip>
  );
}

function statusColor(
  status: string,
): "accent" | "danger" | "default" | "success" | "warning" {
  const normalized = status.toUpperCase();

  if (
    ["ACTIVE", "COMPLETED", "CONFIRMED", "PAID", "PUBLISHED"].includes(
      normalized,
    )
  ) {
    return "success";
  }

  if (
    ["CANCELLED", "FAILED", "INACTIVE", "OUT_OF_STOCK"].includes(normalized)
  ) {
    return "danger";
  }

  if (
    ["DRAFT", "PENDING", "PENDING_PAYMENT", "PROCESSING"].includes(normalized)
  ) {
    return "warning";
  }

  return "default";
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
