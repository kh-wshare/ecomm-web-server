"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { ProductListLoading } from "./product-list-loading";
import { ProductStatusBadge } from "./product-status-badge";

import type {
  ProductListFilters,
  ProductListItem,
  ProductStatus,
  SalesChannel,
} from "@/types/product";
import { usePermissions } from "@/hooks/use-permissions";
import { deleteProduct, getProducts } from "@/lib/products/product-data";
import { formatCurrency } from "@/lib/formatters/currency";
import { queryKeys } from "@/lib/query/keys";
import { notify } from "@/lib/toast/notify";
import { PRODUCT_STATUSES, SALES_CHANNELS } from "@/types/product";

const pageSize = 10;

export function ProductList() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canRead = can("product.read");
  const canCreate = can("product.create");
  const canUpdate = can("product.update");
  const canDelete = can("product.delete");
  const canReadInventory = can("inventory.read");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<ProductStatus | "ALL">("ALL");
  const [channel, setChannel] = useState<SalesChannel | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const filters: ProductListFilters = {
    channel,
    search: deferredSearch,
    status,
  };
  const productsQuery = useQuery({
    queryKey: queryKeys.products.list({
      ...filters,
      inventory: canReadInventory,
    }),
    queryFn: () => getProducts(filters, canReadInventory),
    enabled: canRead,
  });
  const deleteMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      await Promise.all(
        productIds.map((productId) => deleteProduct(productId)),
      );
    },
    onSuccess: async (_, productIds) => {
      setSelected([]);
      notify.success(
        `${productIds.length} product${productIds.length === 1 ? "" : "s"} deleted`,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error) => notify.error(error, "Unable to delete products"),
  });
  const products = productsQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageProducts = products.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  if (!canRead) {
    return (
      <PermissionNotice message="You do not have permission to view products." />
    );
  }

  if (productsQuery.isPending) return <ProductListLoading />;

  if (productsQuery.isError) {
    return (
      <StateNotice
        action="Try again"
        message={productsQuery.error.message}
        title="Products are unavailable"
        onAction={() => productsQuery.refetch()}
      />
    );
  }

  const allPageSelected =
    pageProducts.length > 0 &&
    pageProducts.every((product) => selected.includes(product.id));

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Catalog</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Products
          </h2>
          <p className="mt-2 text-sm text-muted">
            Manage product details, availability, pricing, and stock.
          </p>
        </div>
        {canCreate && (
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
            href="/dashboard/products/new"
          >
            Create product
          </Link>
        )}
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-3">
        <label className="sm:col-span-1">
          <span className="sr-only">Search products</span>
          <input
            className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm outline-none focus:border-accent"
            placeholder="Search name, SKU, or slug"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
              setSelected([]);
            }}
          />
        </label>
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value as ProductStatus | "ALL");
            setPage(1);
            setSelected([]);
          }}
        >
          <option value="ALL">All statuses</option>
          {PRODUCT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {toLabel(item)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Channel"
          value={channel}
          onChange={(value) => {
            setChannel(value as SalesChannel | "ALL");
            setPage(1);
            setSelected([]);
          }}
        >
          <option value="ALL">All channels</option>
          {SALES_CHANNELS.map((item) => (
            <option key={item} value={item}>
              {toLabel(item)}
            </option>
          ))}
        </FilterSelect>
      </div>

      {selected.length > 0 && canDelete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3">
          <p className="text-sm font-medium">{selected.length} selected</p>
          <button
            className="rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            disabled={deleteMutation.isPending}
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Delete ${selected.length} selected product${selected.length === 1 ? "" : "s"}?`,
                )
              ) {
                deleteMutation.mutate(selected);
              }
            }}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete selected"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm">
        {products.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-surface-secondary text-xs text-muted">
                  <tr>
                    {canDelete && (
                      <th className="w-12 px-4 py-3">
                        <input
                          aria-label="Select all products on this page"
                          checked={allPageSelected}
                          type="checkbox"
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? Array.from(
                                    new Set([
                                      ...current,
                                      ...pageProducts.map(({ id }) => id),
                                    ]),
                                  )
                                : current.filter(
                                    (id) =>
                                      !pageProducts.some(
                                        (product) => product.id === id,
                                      ),
                                  ),
                            )
                          }
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Channels</th>
                    <th className="px-4 py-3 font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Price</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageProducts.map((product) => (
                    <ProductRow
                      canDelete={canDelete}
                      canUpdate={canUpdate}
                      checked={selected.includes(product.id)}
                      key={product.id}
                      product={product}
                      showStock={canReadInventory}
                      onDelete={() => {
                        if (window.confirm(`Delete “${product.name}”?`)) {
                          deleteMutation.mutate([product.id]);
                        }
                      }}
                      onSelect={(checked) =>
                        setSelected((current) =>
                          checked
                            ? Array.from(new Set([...current, product.id]))
                            : current.filter((id) => id !== product.id),
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={currentPage}
              total={products.length}
              totalPages={totalPages}
              onPage={setPage}
            />
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No products found</p>
            <p className="mt-1 text-sm text-muted">
              {deferredSearch || status !== "ALL" || channel !== "ALL"
                ? "Try changing your search or filters."
                : "Create your first product to start building the catalog."}
            </p>
            {canCreate &&
              !deferredSearch &&
              status === "ALL" &&
              channel === "ALL" && (
                <Link
                  className="mt-5 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
                  href="/dashboard/products/new"
                >
                  Create product
                </Link>
              )}
          </div>
        )}
      </div>
    </section>
  );
}

function ProductRow({
  canDelete,
  canUpdate,
  checked,
  product,
  showStock,
  onDelete,
  onSelect,
}: {
  canDelete: boolean;
  canUpdate: boolean;
  checked: boolean;
  product: ProductListItem;
  showStock: boolean;
  onDelete: () => void;
  onSelect: (checked: boolean) => void;
}) {
  const totalStock = product.stocks.reduce(
    (total, stock) => total + stock.totalStock,
    0,
  );
  const sellableStock = product.stocks.reduce(
    (total, stock) => total + stock.onlineSellableStock,
    0,
  );
  const lowStock =
    product.stocks.length > 0 &&
    product.stocks.some(
      (stock) =>
        stock.availableStock <= 0 ||
        (stock.safetyBuffer > 0 && stock.availableStock <= stock.safetyBuffer),
    );
  const channels =
    product.channelVisibility?.filter((item) => item.isVisible) ?? [];

  return (
    <tr className="border-t border-separator first:border-0 hover:bg-surface-secondary/60">
      {canDelete && (
        <td className="px-4 py-4">
          <input
            aria-label={`Select ${product.name}`}
            checked={checked}
            type="checkbox"
            onChange={(event) => onSelect(event.target.checked)}
          />
        </td>
      )}
      <td className="px-4 py-4">
        <Link
          className="font-semibold hover:text-accent"
          href={`/dashboard/products/${product.id}`}
        >
          {product.name}
        </Link>
        <p className="mt-1 text-xs text-muted">{product.sku}</p>
      </td>
      <td className="px-4 py-4">
        <ProductStatusBadge status={product.status} />
      </td>
      <td className="px-4 py-4">
        {channels.length ? (
          <div className="flex max-w-56 flex-wrap gap-1.5">
            {channels.map((item) => (
              <span
                className="rounded-md bg-accent/8 px-2 py-1 text-[10px] font-semibold text-accent"
                key={item.channel}
              >
                {toLabel(item.channel)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted">Hidden</span>
        )}
      </td>
      <td className="px-4 py-4">
        {showStock ? (
          product.stocks.length ? (
            <div>
              <p
                className={
                  lowStock ? "font-semibold text-danger" : "font-semibold"
                }
              >
                {sellableStock} sellable
              </p>
              <p className="mt-1 text-xs text-muted">{totalStock} total</p>
            </div>
          ) : (
            <span className="text-xs font-medium text-warning-foreground">
              Not stocked
            </span>
          )
        ) : (
          <span className="text-xs text-muted">Restricted</span>
        )}
      </td>
      <td className="px-4 py-4 text-right font-semibold">
        {formatCurrency(product.price, product.currency)}
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <Link
            className="rounded-lg border border-separator px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-secondary"
            href={`/dashboard/products/${product.id}`}
          >
            View
          </Link>
          {canUpdate && (
            <Link
              className="rounded-lg border border-separator px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-secondary"
              href={`/dashboard/products/${product.id}/edit`}
            >
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
              type="button"
              onClick={onDelete}
            >
              Delete
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function FilterSelect({
  children,
  label,
  value,
  onChange,
}: {
  children: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm outline-none focus:border-accent"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function Pagination({
  page,
  total,
  totalPages,
  onPage,
}: {
  page: number;
  total: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-separator px-4 py-3">
      <p className="text-xs text-muted">
        {total} product{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg border border-separator px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          disabled={page === 1}
          type="button"
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <span className="text-xs text-muted">
          Page {page} of {totalPages}
        </span>
        <button
          className="rounded-lg border border-separator px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          disabled={page === totalPages}
          type="button"
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StateNotice({
  action,
  message,
  title,
  onAction,
}: {
  action: string;
  message: string;
  title: string;
  onAction: () => void;
}) {
  return (
    <div className="grid min-h-[55vh] place-items-center text-center">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted">{message}</p>
        <button
          className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          type="button"
          onClick={onAction}
        >
          {action}
        </button>
      </div>
    </div>
  );
}

function PermissionNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
      {message}
    </div>
  );
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
