"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { usePermissions } from "@/hooks/use-permissions";
import { getInventoryMovements } from "@/lib/inventory/inventory-data";
import { formatDate } from "@/lib/formatters/date";
import { queryKeys } from "@/lib/query/keys";

export function InventoryMovements() {
  const { can } = usePermissions();
  const canRead = can("inventory.read");
  const [productId, setProductId] = useState("ALL");
  const [movementType, setMovementType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const movementsQuery = useQuery({
    queryKey: [...queryKeys.inventory.all, "movements"],
    queryFn: getInventoryMovements,
    enabled: canRead,
  });
  const movements = useMemo(
    () => movementsQuery.data ?? [],
    [movementsQuery.data],
  );
  const products = useMemo(
    () =>
      Array.from(
        new Map(
          movements.map((movement) => [
            movement.productId,
            {
              id: movement.productId,
              name: movement.productName,
              sku: movement.productSku,
            },
          ]),
        ).values(),
      ).sort((first, second) => first.name.localeCompare(second.name)),
    [movements],
  );
  const movementTypes = useMemo(
    () =>
      Array.from(new Set(movements.map((movement) => movement.type))).sort(),
    [movements],
  );
  const filtered = movements.filter((movement) => {
    const timestamp = new Date(movement.createdAt).getTime();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return (
      (productId === "ALL" || movement.productId === productId) &&
      (movementType === "ALL" || movement.type === movementType) &&
      (from === null || timestamp >= from) &&
      (to === null || timestamp <= to)
    );
  });

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to view inventory movements.
      </div>
    );
  }

  if (movementsQuery.isPending) return <HistoryLoading />;

  if (movementsQuery.isError) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-center">
        <div>
          <h2 className="text-xl font-semibold">Movements are unavailable</h2>
          <p className="mt-2 text-sm text-muted">
            {movementsQuery.error.message}
          </p>
          <button
            className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            type="button"
            onClick={() => movementsQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <header>
        <Link
          className="text-sm font-medium text-accent hover:underline"
          href="/dashboard/inventory"
        >
          ← Inventory
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Stock movement history
        </h2>
        <p className="mt-2 text-sm text-muted">
          A chronological audit of inventory changes across products.
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-separator bg-surface p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Filter label="Product" value={productId} onChange={setProductId}>
          <option value="ALL">All products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </Filter>
        <Filter
          label="Movement type"
          value={movementType}
          onChange={setMovementType}
        >
          <option value="ALL">All movement types</option>
          {movementTypes.map((type) => (
            <option key={type} value={type}>
              {toLabel(type)}
            </option>
          ))}
        </Filter>
        <DateField label="From" value={dateFrom} onChange={setDateFrom} />
        <DateField label="To" value={dateTo} onChange={setDateTo} />
      </div>

      <div className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-semibold">Timeline</h3>
          <p className="text-xs text-muted">
            {filtered.length} movement{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        {filtered.length ? (
          <ol className="relative ml-2 border-l border-separator">
            {filtered.map((movement) => (
              <li className="relative pb-6 pl-7 last:pb-0" key={movement.id}>
                <span
                  className={`absolute -left-2 top-1 grid size-4 place-items-center rounded-full ring-4 ring-surface ${
                    movement.quantity < 0 ? "bg-danger" : "bg-success"
                  }`}
                />
                <div className="flex flex-col gap-2 rounded-xl bg-surface-secondary p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{movement.productName}</p>
                      <span className="rounded-md bg-background px-2 py-1 text-[10px] font-semibold text-muted">
                        {movement.productSku}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {toLabel(movement.type)}
                      {movement.referenceType
                        ? ` · ${toLabel(movement.referenceType)}`
                        : ""}
                      {movement.referenceId ? ` · ${movement.referenceId}` : ""}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p
                      className={`font-bold ${
                        movement.quantity < 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </p>
                    <time className="mt-1 block text-[10px] text-muted">
                      {formatDate(
                        movement.createdAt,
                        { dateStyle: "medium", timeStyle: "short" },
                        "en-US",
                      )}
                    </time>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-separator px-4 py-12 text-center text-sm text-muted">
            No stock movements match these filters.
          </p>
        )}
      </div>
    </section>
  );
}

function Filter({
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
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </span>
      <select
        className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </span>
      <input
        className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function HistoryLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-24 rounded-2xl bg-surface-secondary" />
      <div className="h-[500px] rounded-2xl bg-surface-secondary" />
    </div>
  );
}

function toLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
