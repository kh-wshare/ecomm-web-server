"use client";

import { Checkbox, Label, Pagination, SearchField, Table, Tooltip, type Selection } from "@heroui/react";
import { useDeferredValue, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Icon } from "@iconify/react";

import { ProductListLoading } from "./product-list-loading";
import { ProductStatusBadge } from "./product-status-badge";

import { Button, Input, Select } from "@/components/ui/hero-controls";
import type {
  ProductListFilters,
  ProductListItem,
  ProductStatus,
  SalesChannel,
} from "@/types/product";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useProducts } from "@/hooks/api/use-products";
import { usePermissions } from "@/hooks/use-permissions";
import { deleteProduct } from "@/lib/products/product-data";
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
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const filters: ProductListFilters = {
    channel,
    search: deferredSearch,
    status,
  };
  const productsQuery = useProducts(filters, canReadInventory, canRead);
  const deleteMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      await Promise.all(
        productIds.map((productId) => deleteProduct(productId)),
      );
    },
    onSuccess: async (_, productIds) => {
      setSelected([]);
      setPendingDelete(null);
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
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

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

  const updateSelection = (keys: Selection) => {
    const pageProductIds = new Set(pageProducts.map((product) => product.id));
    const selectedPageIds =
      keys === "all"
        ? pageProductIds
        : new Set(
          Array.from(keys, String).filter((id) => pageProductIds.has(id)),
        );

    setSelected((current) => [
      ...current.filter((id) => !pageProductIds.has(id)),
      ...Array.from(selectedPageIds),
    ]);
  };

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
        <div className="flex flex-wrap items-center gap-3">
          {selected.length > 0 && canDelete && (
            <div>
              <Button
                className="bg-danger px-3 disabled:opacity-60"
                disabled={deleteMutation.isPending}
                type="button"
                onClick={() => setPendingDelete(selected)}
              >
                {deleteMutation.isPending ? "Deleting…" : `Delete selected (${selected.length})`}
              </Button>
            </div>
          )}
          {canCreate && (
            <Link
              href="/dashboard/products/new"
            >
              <Button type="button" variant="primary" size="md">
                Create product
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-4">
        <div className="flex flex-col col-span-2 gap-1">
          <SearchField name="search" value={search}>
            <Label>Search</Label>
            <SearchField.Group className="bg-surface-secondary">
              <SearchField.SearchIcon />
              <SearchField.Input value={search} onChange={(event) => {
                setSearch(event.target.value),
                  setPage(1);
                setSelected([]);
              }} placeholder="Search products..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
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

      {/* <div className="flex flex-col gap-4 rounded-2xl border border-separator bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <SearchField name="search" value={search}>
            <Label className="text-xs font-medium text-muted">Search</Label>

            <SearchField.Group className="mt-1 flex h-10 items-center gap-2 rounded-xl border border-separator bg-surface-secondary px-3 transition focus-within:border-accent/60 focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/15">
              <SearchField.SearchIcon className="size-4 shrink-0 text-muted" />

              <SearchField.Input
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
                placeholder="Search products..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelected([]);
                }}
              />

              <SearchField.ClearButton className="rounded-md text-muted transition hover:bg-surface hover:text-foreground" />
            </SearchField.Group>
          </SearchField>
        </div>

        <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-end sm:justify-end">
          <div className="w-full sm:w-44">
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
          </div>

          <div className="w-full sm:w-44">
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
        </div>
      </div> */}

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface">
        {products.length ? (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Products"
                className="text-left text-sm"
                selectedKeys={new Set(selected)}
                selectionMode={canDelete ? "multiple" : "none"}
                onSelectionChange={updateSelection}
              >
                <Table.Header className="text-muted text-xs font-semibold">
                  {canDelete && (
                    <Table.Column className="w-12 px-4 py-3 rounded-b-none">
                      <Checkbox
                        aria-label="Select all products on this page"
                        slot="selection"
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                    </Table.Column>
                  )}
                  <Table.Column
                    className="px-4 py-3 font-medium"
                    id="product"
                    isRowHeader
                  >
                    Product
                  </Table.Column>
                  <Table.Column className="px-4 py-3 font-medium" id="channels">
                    Channels
                  </Table.Column>
                  <Table.Column className="px-4 py-3 font-medium" id="stock">
                    Stock
                  </Table.Column>
                  <Table.Column
                    className="px-4 py-3 font-medium"
                    id="price"
                  >
                    Price
                  </Table.Column>
                  <Table.Column className="px-4 py-3 font-medium" id="status">
                    Status
                  </Table.Column>
                  <Table.Column className="px-4 py-3 font-medium" id="createdAt">
                    Created At
                  </Table.Column>
                  <Table.Column
                    className="px-4 py-3 text-right font-medium rounded-b-none"
                    id="actions"
                  >
                    Actions
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {pageProducts.map((product) => (
                    <ProductRow
                      canDelete={canDelete}
                      canUpdate={canUpdate}
                      key={product.id}
                      product={product}
                      showStock={canReadInventory}
                      onDelete={() => setPendingDelete([product.id])}
                    />
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
            <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary className="text-xs text-muted">
                  {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, products.length)} of{" "}
                  {products.length} results
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={currentPage === 1}
                      onPress={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      <Pagination.PreviousIcon />
                      Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  {pages.map((pageNumber) => (
                    <Pagination.Item key={pageNumber}>
                      <Pagination.Link
                        isActive={pageNumber === currentPage}
                        onPress={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={currentPage === totalPages}
                      onPress={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    >
                      Next
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </Table.Footer>
          </Table>
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
      <ConfirmDialog
        confirmLabel={
          pendingDelete?.length === 1 ? "Delete product" : "Delete products"
        }
        description={`This permanently deletes ${pendingDelete?.length ?? 0
          } product${pendingDelete?.length === 1 ? "" : "s"
          } and removes them from every sales channel.`}
        isPending={deleteMutation.isPending}
        open={Boolean(pendingDelete)}
        title="Delete selected products?"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete);
        }}
      />
    </section>
  );
}

function ProductRow({
  canDelete,
  canUpdate,
  product,
  showStock,
  onDelete,
}: {
  canDelete: boolean;
  canUpdate: boolean;
  product: ProductListItem;
  showStock: boolean;
  onDelete: () => void;
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
    <Table.Row
      className="border-t border-separator first:border-0 hover:bg-surface-secondary/30"
      id={product.id}
    >
      {canDelete && (
        <Table.Cell className="px-4 py-4">
          <Checkbox
            aria-label={`Select ${product.name}`}
            slot="selection"
            variant="secondary"
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox.Content>
          </Checkbox>
        </Table.Cell>
      )}
      <Table.Cell className="px-4 py-4">
        <Link
          className="font-semibold hover:text-accent"
          href={`/dashboard/products/${product.id}`}
        >
          {product.name}
        </Link>
        <p className="mt-1 text-xs text-muted">{product.sku}</p>
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
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
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
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
      </Table.Cell>
      <Table.Cell className="px-4 py-4 font-semibold">
        {formatCurrency(product.price, product.currency)}
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <ProductStatusBadge status={product.status} />
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        {new Date(product.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </Table.Cell>
      <Table.Cell className="px-4 py-4 w-34">
        <div className="flex items-center gap-1">
          <Tooltip delay={0}>
            <Link href={`/dashboard/products/${product.id}`}>
              <Button type="button" isIconOnly size="sm" variant="tertiary">
                <Icon className="size-4" icon="gravity-ui:eye" />
              </Button>
            </Link>
            <Tooltip.Content>
              <p>View</p>
            </Tooltip.Content>
          </Tooltip>
          {canUpdate && (
            <Tooltip delay={0}>
              <Link href={`/dashboard/products/${product.id}/edit`}>
                <Button type="button" isIconOnly size="sm" variant="tertiary">
                  <Icon className="size-4" icon="gravity-ui:pencil" />
                </Button>
              </Link>
              <Tooltip.Content>
                <p>Edit</p>
              </Tooltip.Content>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip delay={0}>
              <Button type="button" isIconOnly size="sm" variant="danger-soft" onClick={onDelete}>
                <Icon className="size-4" icon="gravity-ui:trash-bin" />
              </Button>
              <Tooltip.Content>
                <p>Delete</p>
              </Tooltip.Content>
            </Tooltip>
          )}
        </div>
      </Table.Cell>
    </Table.Row>
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
    <Select
      value={value}
      label={label}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </Select>
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
        <Button
          className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          type="button"
          onClick={onAction}
        >
          {action}
        </Button>
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
