'use client';

import {
  Checkbox,
  EmptyState as HeroEmptyState,
  Label,
  Pagination,
  SearchField,
  Table,
  Tooltip,
  type Selection,
} from '@heroui/react';
import { type ReactNode, useDeferredValue, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Icon } from '@iconify/react';

import { ProductStatusBadge } from './product-status-badge';

import { Button, Select } from './product-controls';
import type {
  ProductListFilters,
  ProductListItem,
  ProductStatus,
  SalesChannel,
} from '@/types/product';
import { ConfirmDialog } from '@repo/ui';
import { useProducts } from '@/hooks/api/use-products';
import { usePermissions } from '@/hooks/use-permissions';
import { deleteProduct } from '@/lib/products/product-data';
import { formatCurrency } from '@/lib/formatters/currency';
import { queryKeys } from '@repo/query-client';
import { notify } from '@/lib/toast/notify';
import { PRODUCT_STATUSES, SALES_CHANNELS } from '@/types/product';

const pageSize = 10;

export function ProductList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canRead = can('products.read');
  const canCreate = can('products.create');
  const canUpdate = can('products.update');
  const canDelete = can('products.delete');
  const canReadInventory = can('inventory.read');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState<ProductStatus | 'ALL'>('ALL');
  const [channel, setChannel] = useState<SalesChannel | 'ALL'>('ALL');
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
        `${productIds.length} product${productIds.length === 1 ? '' : 's'} deleted`,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error) => notify.error(error, 'Unable to delete products'),
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

  const updateSelection = (keys: Selection) => {
    const pageProductIds = new Set(pageProducts.map((product) => product.id));
    const selectedPageIds =
      keys === 'all'
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
                {deleteMutation.isPending
                  ? 'Deleting…'
                  : `Delete selected (${selected.length})`}
              </Button>
            </div>
          )}
          {canCreate && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onPress={() => router.push('/products/new')}
            >
              Create product
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-4">
        <div className="flex flex-col col-span-2 gap-1">
          <SearchField name="search" value={search}>
            <Label>Search</Label>
            <SearchField.Group className="bg-surface-secondary shadow-none">
              <SearchField.SearchIcon />
              <SearchField.Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelected([]);
                }}
                placeholder="Search products..."
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value as ProductStatus | 'ALL');
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
            setChannel(value as SalesChannel | 'ALL');
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
      <div className="overflow-hidden rounded-2xl border border-separator bg-surface">
        <Table
          variant="secondary"
        >
          <Table.ScrollContainer className="max-h-[calc(100dvh-22rem)]">
            <Table.Content
              aria-label="Products"
              className="h-full min-w-[1120px] table-fixed text-left text-sm"
              selectedKeys={new Set(selected)}
              selectionMode={canDelete ? 'multiple' : 'none'}
              onSelectionChange={updateSelection}
            >
              <Table.Header className="text-muted text-xs font-semibold">
                {canDelete && (
                  <Table.Column
                    className="w-12 rounded-b-none px-4 py-3"
                    id="select"
                  >
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
                  className="w-[280px] px-4 py-3 font-medium"
                  id="product"
                  isRowHeader
                >
                  Product
                </Table.Column>
                <Table.Column
                  className="w-[190px] px-4 py-3 font-medium"
                  id="channels"
                >
                  Channels
                </Table.Column>
                <Table.Column
                  className="w-[140px] px-4 py-3 font-medium"
                  id="stock"
                >
                  Stock
                </Table.Column>
                <Table.Column
                  className="w-[120px] px-4 py-3 font-medium"
                  id="price"
                >
                  Price
                </Table.Column>
                <Table.Column
                  className="w-[120px] px-4 py-3 font-medium"
                  id="status"
                >
                  Status
                </Table.Column>
                <Table.Column
                  className="w-[130px] px-4 py-3 font-medium"
                  id="createdAt"
                >
                  Created At
                </Table.Column>
                <Table.Column
                  className="w-[110px] rounded-b-none px-4 py-3 text-right font-medium"
                  id="actions"
                >
                  Actions
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => {
                  if (productsQuery.isPending) {
                    return <LoadingState label="Loading products" />;
                  }
                  if (productsQuery.isError) {
                    return (
                      <ErrorState
                        message={productsQuery.error.message}
                        onRetry={() => productsQuery.refetch()}
                      />
                    );
                  }
                  return (
                    <div className="min-h-80 md:min-h-[calc(100dvh-24rem)]">
                      <ProductEmptyState
                        canCreate={canCreate}
                        channel={channel}
                        search={deferredSearch}
                        status={status}
                      />
                    </div>
                  );
                }}
              >
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
          {products.length ? (
            <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary className="text-xs text-muted">
                  {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, products.length)} of{' '}
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
          ) : null}
        </Table>
      </div>
      <ConfirmDialog
        confirmLabel={
          pendingDelete?.length === 1 ? 'Delete product' : 'Delete products'
        }
        description={`This permanently deletes ${pendingDelete?.length ?? 0
          } product${pendingDelete?.length === 1 ? '' : 's'
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
  const router = useRouter();
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
          href={`/products/${product.id}`}
        >
          {product.name}
        </Link>
        <p className="mt-1 text-xs text-muted">{product.sku}</p>
        <p className="mt-1 text-xs text-muted">
          {product.category?.name ?? 'Uncategorized'}
        </p>
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
                  lowStock ? 'font-semibold text-danger' : 'font-semibold'
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
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </Table.Cell>
      <Table.Cell className="px-4 py-4 w-34">
        <div className="flex items-center gap-1">
          <Tooltip delay={0}>
            <Button
              type="button"
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={() => router.push(`/products/${product.id}`)}
            >
              <Icon className="size-4" icon="gravity-ui:eye" />
            </Button>
            <Tooltip.Content>
              <p>View</p>
            </Tooltip.Content>
          </Tooltip>
          {canUpdate && (
            <Tooltip delay={0}>
              <Button
                type="button"
                isIconOnly
                size="sm"
                variant="tertiary"
                onPress={() => router.push(`/products/${product.id}/edit`)}
              >
                <Icon className="size-4" icon="gravity-ui:pencil" />
              </Button>
              <Tooltip.Content>
                <p>Edit</p>
              </Tooltip.Content>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip delay={0}>
              <Button
                type="button"
                isIconOnly
                size="sm"
                variant="danger-soft"
                onPress={onDelete}
              >
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
  children: ReactNode;
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

function TableStateContent({ children }: { children: ReactNode }) {
  return (
    <HeroEmptyState className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-4 text-center md:min-h-[calc(100dvh-30rem)]">
      {children}
    </HeroEmptyState>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <TableStateContent>
      <Icon
        className="size-6 animate-spin text-muted"
        icon="gravity-ui:arrows-rotate-right"
      />
      <span className="text-sm text-muted">{label}</span>
    </TableStateContent>
  );
}

function ProductEmptyState({
  canCreate,
  channel,
  search,
  status,
}: {
  canCreate: boolean;
  channel: SalesChannel | 'ALL';
  search: string;
  status: ProductStatus | 'ALL';
}) {
  const hasFilters = Boolean(search || status !== 'ALL' || channel !== 'ALL');

  return (
    <TableStateContent>
      <Icon className="size-6 text-muted" icon="gravity-ui:tray" />
      <span className="text-sm font-semibold">No products found</span>
      <span className="max-w-sm text-xs text-muted">
        {hasFilters
          ? 'Try changing your search or filters.'
          : 'Create your first product to start building the catalog.'}
      </span>
      {canCreate && !hasFilters && (
        <Link
          className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
          href="/products/new"
        >
          Create product
        </Link>
      )}
    </TableStateContent>
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
    <TableStateContent>
      <Icon className="size-6 text-danger" icon="gravity-ui:circle-xmark" />
      <span className="text-sm font-semibold">Products are unavailable</span>
      <span className="max-w-sm text-xs text-muted">{message}</span>
      <Button type="button" variant="primary" onPress={onRetry}>
        Try again
      </Button>
    </TableStateContent>
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
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
}
