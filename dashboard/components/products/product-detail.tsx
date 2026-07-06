"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ProductStatusBadge } from "./product-status-badge";

import { Button } from "@/components/ui/hero-controls";
import { Table } from "@/components/ui/hero-table";
import type {
  Product,
  ProductInventoryDetail,
  ProductOrder,
} from "@/types/product";
import { ImageGallery } from "@/components/ui/image-gallery";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getProduct,
  getProductInventory,
  getProductOrders,
} from "@/lib/products/product-data";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDate } from "@/lib/formatters/date";
import { queryKeys } from "@/lib/query/keys";

export function ProductDetail({ productId }: { productId: string }) {
  const { can } = usePermissions();
  const canRead = can("product.read");
  const canEdit = can("product.update");
  const canReadInventory = can("inventory.read");
  const canReadOrders = can("order.read");
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
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to view product details.
      </div>
    );
  }

  if (productQuery.isPending) return <ProductDetailLoading />;

  if (productQuery.isError) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        <div>
          <h2 className="text-xl font-semibold">Product is unavailable</h2>
          <p className="mt-2 text-sm text-muted">
            {productQuery.error.message}
          </p>
          <Button
            className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            type="button"
            onClick={() => productQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const product = productQuery.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-accent hover:underline"
            href="/dashboard/products"
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
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
            href={`/dashboard/products/${product.id}/edit`}
          >
            Edit product
          </Link>
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
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => (
                  <tr className="border-t border-separator" key={variant.id}>
                    <td className="py-3 font-medium">{variant.name}</td>
                    <td className="py-3 text-muted">{variant.sku}</td>
                    <td className="py-3 text-xs">{variant.status}</td>
                    <td className="py-3 text-right font-semibold">
                      {formatCurrency(variant.price, product.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
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
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Quantity</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Product revenue</th>
              </tr>
            </thead>
            <tbody>
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
                  <tr className="border-t border-separator" key={order.id}>
                    <td className="py-3 font-semibold">{order.orderNumber}</td>
                    <td className="py-3 text-muted">
                      {formatDate(
                        order.createdAt,
                        { dateStyle: "medium" },
                        "en-US",
                      )}
                    </td>
                    <td className="py-3">{quantity}</td>
                    <td className="py-3 text-xs">{order.status}</td>
                    <td className="py-3 text-right font-semibold">
                      {formatCurrency(revenue, order.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
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
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Movement</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Reference</th>
                <th className="pb-2 text-right font-medium">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {inventory.recentMovements.map((movement) => (
                <tr className="border-t border-separator" key={movement.id}>
                  <td className="py-3 font-semibold">
                    {toLabel(movement.type)}
                  </td>
                  <td className="py-3 text-muted">
                    {formatDate(
                      movement.createdAt,
                      { dateStyle: "medium", timeStyle: "short" },
                      "en-US",
                    )}
                  </td>
                  <td className="py-3 text-muted">
                    {movement.referenceType
                      ? toLabel(movement.referenceType)
                      : "Manual"}
                  </td>
                  <td
                    className={`py-3 text-right font-semibold ${
                      movement.quantity < 0 ? "text-danger" : "text-success"
                    }`}
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
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
            <div
              className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-3"
              key={item.channel}
            >
              <p className="text-sm font-semibold">{toLabel(item.channel)}</p>
              <div className="text-right text-[10px] font-semibold">
                <p className={item.isVisible ? "text-success" : "text-muted"}>
                  {item.isVisible ? "Visible" : "Hidden"}
                </p>
                <p
                  className={item.isPurchasable ? "text-accent" : "text-muted"}
                >
                  {item.isPurchasable ? "Purchasable" : "Not purchasable"}
                </p>
              </div>
            </div>
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
    <div className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold" title={value}>
        {value}
      </p>
    </div>
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
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <h3 className="mb-5 font-semibold">{title}</h3>
      {children}
    </section>
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
    <p className="rounded-xl border border-dashed border-separator px-4 py-8 text-center text-sm text-muted">
      {message}
    </p>
  );
}

function Restricted({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
      {message}
    </p>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-10 rounded-lg bg-surface-secondary" />
      <div className="h-10 rounded-lg bg-surface-secondary" />
      <div className="h-10 rounded-lg bg-surface-secondary" />
    </div>
  );
}

function ProductDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-20 rounded-2xl bg-surface-secondary" />
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-24 rounded-2xl bg-surface-secondary" key={index} />
        ))}
      </div>
      <div className="h-96 rounded-2xl bg-surface-secondary" />
    </div>
  );
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
