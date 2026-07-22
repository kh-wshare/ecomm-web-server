'use client';

import {
  Button,
  Checkbox,
  EmptyState as HeroEmptyState,
  Label,
  Pagination,
  SearchField,
  Table,
  Tooltip,
  type Selection,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { type ReactNode, useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { StockAdjustmentModal } from './stock-adjustment-modal';

import { Select as FilterControlSelect } from '@/components/products/product-controls';
import type { DashboardInventoryStock } from '@/types/dashboard';
import type { InventoryFilter } from '@/types/inventory';
import { StockStatusBadge } from '@/components/products/product-editor-fields';
import { usePermissions } from '@/hooks/use-permissions';
import { getInventory } from '@/lib/inventory/inventory-data';
import { formatDate } from '@/lib/formatters/date';
import { queryKeys } from '@repo/query-client';

const pageSize = 12;

export function InventoryTable() {
  const { can } = usePermissions();
  const canRead = can('inventory.read');
  const canAdjust = can('inventory.update');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [filter, setFilter] = useState<InventoryFilter>('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [adjusting, setAdjusting] = useState<DashboardInventoryStock | null>(
    null,
  );
  const inventoryQuery = useQuery({
    queryKey: queryKeys.inventory.list({ search: deferredSearch }),
    queryFn: () => getInventory(deferredSearch),
    enabled: canRead,
  });

  if (!canRead) {
    return (
      <PermissionNotice message="You do not have permission to view inventory." />
    );
  }

  const stocks = (inventoryQuery.data ?? []).filter((stock) => {
    if (filter === 'OUT') return stock.onlineSellableStock <= 0;
    if (filter === 'LOW') return isLowStock(stock);

    return true;
  });
  const totalPages = Math.max(1, Math.ceil(stocks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStocks = stocks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const selectedStock =
    selected.length === 1
      ? stocks.find((stock) => stock.id === selected[0])
      : undefined;
  const updateSelection = (keys: Selection) => {
    const pageStockIds = new Set(pageStocks.map((stock) => stock.id));
    const selectedPageIds =
      keys === 'all'
        ? pageStockIds
        : new Set(
            Array.from(keys, String).filter((id) => pageStockIds.has(id)),
          );

    setSelected((current) => [
      ...current.filter((id) => !pageStockIds.has(id)),
      ...Array.from(selectedPageIds),
    ]);
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">Inventory</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Stock control
          </h2>
          <p className="mt-2 text-sm text-muted">
            Track physical, reserved, sold, and online-sellable quantities.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAdjust && selected.length > 0 && (
            <>
              <Button
                className="h-10 rounded-xl border border-separator px-3 text-xs font-semibold disabled:opacity-50"
                isDisabled={!selectedStock}
                type="button"
                onPress={() => {
                  if (selectedStock) setAdjusting(selectedStock);
                }}
              >
                Adjust selected ({selected.length})
              </Button>
              <Button
                className="h-10 rounded-xl border border-separator px-3 text-xs font-semibold"
                type="button"
                onPress={() => setSelected([])}
              >
                Clear
              </Button>
            </>
          )}
          <Link
            className="inline-flex h-10 items-center rounded-xl border border-separator px-3 text-xs font-semibold"
            href="/inventory/alerts"
          >
            Low-stock alerts
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-xl border border-separator px-3 text-xs font-semibold"
            href="/inventory/movements"
          >
            Movement history
          </Link>
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-1">
          <SearchField name="search" value={search}>
            <Label>Search</Label>
            <SearchField.Group className="bg-surface-secondary shadow-none">
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="Search inventory..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelected([]);
                }}
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
        <FilterSelect
          label="Stock status"
          value={filter}
          onChange={(value) => {
            setFilter(value as InventoryFilter);
            setPage(1);
            setSelected([]);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface">
        <Table
          variant="secondary"
        >
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Inventory"
              className="h-full min-w-[1180px] table-fixed text-left text-sm"
              selectedKeys={new Set(selected)}
              selectionMode={canAdjust ? 'multiple' : 'none'}
              onSelectionChange={updateSelection}
            >
              <Table.Header className="text-xs font-semibold text-muted">
                {canAdjust && (
                  <Table.Column
                    className="w-12 rounded-b-none px-4 py-3"
                    id="select"
                  >
                    <Checkbox
                      aria-label="Select all inventory on this page"
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
                  className="w-[260px] px-4 py-3 font-medium"
                  id="product"
                  isRowHeader
                >
                  Product
                </Table.Column>
                <Table.Column
                  className="w-[160px] px-4 py-3 font-medium"
                  id="sku"
                >
                  SKU
                </Table.Column>
                <Table.Column
                  className="w-[105px] px-4 py-3 text-right font-medium"
                  id="total"
                >
                  Total
                </Table.Column>
                <Table.Column
                  className="w-[110px] px-4 py-3 text-right font-medium"
                  id="reserved"
                >
                  Reserved
                </Table.Column>
                <Table.Column
                  className="w-[105px] px-4 py-3 text-right font-medium"
                  id="sold"
                >
                  Sold
                </Table.Column>
                <Table.Column
                  className="w-[105px] px-4 py-3 text-right font-medium"
                  id="buffer"
                >
                  Buffer
                </Table.Column>
                <Table.Column
                  className="w-[110px] px-4 py-3 text-right font-medium"
                  id="sellable"
                >
                  Sellable
                </Table.Column>
                <Table.Column
                  className="w-[165px] px-4 py-3 font-medium"
                  id="health"
                >
                  Health
                </Table.Column>
                <Table.Column
                  className="w-[100px] rounded-b-none px-4 py-3 text-right font-medium"
                  id="actions"
                >
                  Actions
                </Table.Column>
              </Table.Header>
              <Table.Body
                renderEmptyState={() => {
                  if (inventoryQuery.isPending) {
                    return <LoadingState label="Loading inventory" />;
                  }
                  if (inventoryQuery.isError) {
                    return (
                      <ErrorState
                        message={inventoryQuery.error.message}
                        onRetry={() => inventoryQuery.refetch()}
                      />
                    );
                  }
                  return <InventoryEmptyState />;
                }}
              >
                {pageStocks.map((stock) => (
                  <InventoryRow
                    canAdjust={canAdjust}
                    key={stock.id}
                    stock={stock}
                    onAdjust={() => setAdjusting(stock)}
                  />
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {stocks.length ? (
            <Table.Footer>
              <Pagination size="sm">
                <Pagination.Summary className="text-xs text-muted">
                  {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, stocks.length)} of{' '}
                  {stocks.length} results
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

      {adjusting && (
        <StockAdjustmentModal
          stock={adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
    </section>
  );
}

export function StockHealth({ stock }: { stock: DashboardInventoryStock }) {
  return (
    <StockStatusBadge
      availableStock={stock.availableStock}
      onlineSellableStock={stock.onlineSellableStock}
      safetyBuffer={stock.safetyBuffer}
    />
  );
}

export function isLowStock(stock: DashboardInventoryStock) {
  return (
    stock.onlineSellableStock <= 0 ||
    (stock.safetyBuffer > 0 && stock.availableStock <= stock.safetyBuffer)
  );
}

export const InventoryList = InventoryTable;

function NumberCell({ value }: { value: number }) {
  return (
    <Table.Cell className="px-4 py-4 text-right font-medium">
      {value}
    </Table.Cell>
  );
}

function InventoryRow({
  canAdjust,
  onAdjust,
  stock,
}: {
  canAdjust: boolean;
  onAdjust: () => void;
  stock: DashboardInventoryStock;
}) {
  return (
    <Table.Row
      className="border-t border-separator first:border-0 hover:bg-surface-secondary/30"
      id={stock.id}
    >
      {canAdjust && (
        <Table.Cell className="px-4 py-4">
          <Checkbox
            aria-label={`Select ${stock.product.name}`}
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
          href={`/products/${stock.productId}`}
        >
          {stock.product.name}
        </Link>
        <p className="mt-1 text-xs text-muted">
          {stock.variant?.name ?? 'Base product'}
        </p>
      </Table.Cell>
      <Table.Cell className="px-4 py-4 font-mono text-xs">
        {stock.variant?.sku ?? stock.product.sku}
      </Table.Cell>
      <NumberCell value={stock.totalStock} />
      <NumberCell value={stock.reservedStock} />
      <NumberCell value={stock.soldStock} />
      <NumberCell value={stock.safetyBuffer} />
      <Table.Cell className="px-4 py-4 text-right text-base font-bold">
        {stock.onlineSellableStock}
      </Table.Cell>
      <Table.Cell className="px-4 py-4">
        <StockHealth stock={stock} />
        <p className="mt-1 text-[10px] text-muted">
          {formatDate(stock.updatedAt, { dateStyle: 'medium' }, 'en-US')}
        </p>
      </Table.Cell>
      <Table.Cell className="w-24 px-4 py-4">
        {canAdjust && (
          <div className="flex justify-end">
            <Tooltip delay={0}>
              <Button
                isIconOnly
                size="sm"
                type="button"
                variant="tertiary"
                onPress={onAdjust}
              >
                <Icon className="size-4" icon="gravity-ui:sliders" />
              </Button>
              <Tooltip.Content>
                <p>Adjust stock</p>
              </Tooltip.Content>
            </Tooltip>
          </div>
        )}
      </Table.Cell>
    </Table.Row>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FilterControlSelect
      label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      <option value="ALL">All inventory</option>
      <option value="LOW">Low stock</option>
      <option value="OUT">Out of stock</option>
    </FilterControlSelect>
  );
}

function PermissionNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
      {message}
    </div>
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

function InventoryEmptyState() {
  return (
    <TableStateContent>
      <Icon className="size-6 text-muted" icon="gravity-ui:tray" />
      <span className="text-sm font-semibold">No inventory found</span>
      <span className="max-w-sm text-xs text-muted">
        Try changing the search or stock filter.
      </span>
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
      <span className="text-sm font-semibold">Inventory is unavailable</span>
      <span className="max-w-sm text-xs text-muted">{message}</span>
      <Button type="button" variant="primary" onPress={onRetry}>
        Try again
      </Button>
    </TableStateContent>
  );
}
