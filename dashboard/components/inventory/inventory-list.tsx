"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { StockAdjustmentModal } from "./stock-adjustment-modal";

import type { DashboardInventoryStock } from "@/types/dashboard";
import type { InventoryFilter } from "@/types/inventory";
import { usePermissions } from "@/hooks/use-permissions";
import { getInventory } from "@/lib/inventory/inventory-data";
import { formatDate } from "@/lib/formatters/date";
import { queryKeys } from "@/lib/query/keys";

const pageSize = 12;

export function InventoryList() {
  const { can } = usePermissions();
  const canRead = can("inventory.read");
  const canAdjust = can("inventory.adjust");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [filter, setFilter] = useState<InventoryFilter>("ALL");
  const [page, setPage] = useState(1);
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

  if (inventoryQuery.isPending) return <InventoryLoading />;

  if (inventoryQuery.isError) {
    return (
      <ErrorNotice
        message={inventoryQuery.error.message}
        onRetry={() => inventoryQuery.refetch()}
      />
    );
  }

  const stocks = inventoryQuery.data.filter((stock) => {
    if (filter === "OUT") return stock.onlineSellableStock <= 0;
    if (filter === "LOW") return isLowStock(stock);

    return true;
  });
  const totalPages = Math.max(1, Math.ceil(stocks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStocks = stocks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

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
        <div className="flex gap-2">
          <Link
            className="inline-flex h-10 items-center rounded-xl border border-separator px-3 text-xs font-semibold"
            href="/dashboard/inventory/alerts"
          >
            Low-stock alerts
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-xl border border-separator px-3 text-xs font-semibold"
            href="/dashboard/inventory/movements"
          >
            Movement history
          </Link>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-[1fr_220px]">
        <label>
          <span className="sr-only">Search inventory</span>
          <input
            className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm outline-none focus:border-accent"
            placeholder="Search product or SKU"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <span className="sr-only">Stock filter</span>
          <select
            className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm outline-none focus:border-accent"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as InventoryFilter);
              setPage(1);
            }}
          >
            <option value="ALL">All inventory</option>
            <option value="LOW">Low stock</option>
            <option value="OUT">Out of stock</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm">
        {stocks.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-surface-secondary text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Reserved
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Sold</th>
                    <th className="px-4 py-3 text-right font-medium">Buffer</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Sellable
                    </th>
                    <th className="px-4 py-3 font-medium">Health</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageStocks.map((stock) => (
                    <tr
                      className="border-t border-separator first:border-0 hover:bg-surface-secondary/60"
                      key={stock.id}
                    >
                      <td className="px-4 py-4">
                        <Link
                          className="font-semibold hover:text-accent"
                          href={`/dashboard/products/${stock.productId}`}
                        >
                          {stock.product.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {stock.variant?.name ?? "Base product"}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        {stock.variant?.sku ?? stock.product.sku}
                      </td>
                      <NumberCell value={stock.totalStock} />
                      <NumberCell value={stock.reservedStock} />
                      <NumberCell value={stock.soldStock} />
                      <NumberCell value={stock.safetyBuffer} />
                      <td className="px-4 py-4 text-right text-base font-bold">
                        {stock.onlineSellableStock}
                      </td>
                      <td className="px-4 py-4">
                        <StockHealth stock={stock} />
                        <p className="mt-1 text-[10px] text-muted">
                          {formatDate(
                            stock.updatedAt,
                            { dateStyle: "medium" },
                            "en-US",
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {canAdjust && (
                          <button
                            className="rounded-lg border border-separator px-3 py-1.5 text-xs font-semibold hover:bg-surface-secondary"
                            type="button"
                            onClick={() => setAdjusting(stock)}
                          >
                            Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-separator px-4 py-3">
              <p className="text-xs text-muted">
                {stocks.length} stock record{stocks.length === 1 ? "" : "s"}
              </p>
              <div className="flex items-center gap-3">
                <PageButton
                  disabled={currentPage === 1}
                  label="Previous"
                  onClick={() => setPage(currentPage - 1)}
                />
                <span className="text-xs text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <PageButton
                  disabled={currentPage === totalPages}
                  label="Next"
                  onClick={() => setPage(currentPage + 1)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">No inventory found</p>
            <p className="mt-1 text-sm text-muted">
              Try changing the search or stock filter.
            </p>
          </div>
        )}
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
  if (stock.onlineSellableStock <= 0) {
    return (
      <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-bold text-danger">
        OUT OF STOCK
      </span>
    );
  }
  if (isLowStock(stock)) {
    return (
      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning-foreground">
        LOW STOCK
      </span>
    );
  }

  return (
    <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
      HEALTHY
    </span>
  );
}

export function isLowStock(stock: DashboardInventoryStock) {
  return (
    stock.onlineSellableStock <= 0 ||
    (stock.safetyBuffer > 0 && stock.availableStock <= stock.safetyBuffer)
  );
}

function NumberCell({ value }: { value: number }) {
  return <td className="px-4 py-4 text-right font-medium">{value}</td>;
}

function PageButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-separator px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function InventoryLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 rounded-2xl bg-surface-secondary" />
      <div className="h-[480px] rounded-2xl bg-surface-secondary" />
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

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <h2 className="text-xl font-semibold">Inventory is unavailable</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <button
          className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          type="button"
          onClick={onRetry}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
