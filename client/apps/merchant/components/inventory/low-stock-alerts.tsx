"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { isLowStock, StockHealth } from "./inventory-list";
import { StockAdjustmentModal } from "./stock-adjustment-modal";

import { Button } from "@/components/products/product-controls";
import { Table } from "@repo/ui";
import type { DashboardInventoryStock } from "@/types/dashboard";
import { usePermissions } from "@/hooks/use-permissions";
import { getInventory } from "@/lib/inventory/inventory-data";
import { queryKeys } from "@repo/query-client";

export function LowStockAlerts() {
  const { can } = usePermissions();
  const canRead = can("inventory.read");
  const canAdjust = can("inventory.update");
  const [adjusting, setAdjusting] = useState<DashboardInventoryStock | null>(
    null,
  );
  const inventoryQuery = useQuery({
    queryKey: queryKeys.inventory.list({ alert: true }),
    queryFn: () => getInventory(),
    enabled: canRead,
  });

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
        You do not have permission to view stock alerts.
      </div>
    );
  }

  if (inventoryQuery.isPending) {
    return (
      <div className="h-[420px] rounded-2xl bg-surface-secondary animate-pulse" />
    );
  }

  if (inventoryQuery.isError) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-sm text-danger">
        {inventoryQuery.error.message}
      </div>
    );
  }

  const alerts = inventoryQuery.data.filter(isLowStock);
  const outOfStock = alerts.filter((stock) => stock.onlineSellableStock <= 0);
  const lowStock = alerts.filter((stock) => stock.onlineSellableStock > 0);

  return (
    <section className="space-y-5">
      <header>
        <Link
          className="text-sm font-medium text-accent hover:underline"
          href="/inventory"
        >
          ← Inventory
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Low-stock alerts
        </h2>
        <p className="mt-2 text-sm text-muted">
          Prioritize products at or below their sellable stock threshold.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <AlertMetric
          label="Total alerts"
          tone="warning"
          value={alerts.length}
        />
        <AlertMetric
          label="Out of stock"
          tone="danger"
          value={outOfStock.length}
        />
        <AlertMetric label="Low stock" tone="warning" value={lowStock.length} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-separator bg-surface shadow-sm">
        {alerts.length ? (
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface-secondary text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Available
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Buffer</th>
                  <th className="px-4 py-3 text-right font-medium">Sellable</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((stock) => (
                  <tr className="border-t border-separator" key={stock.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{stock.product.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {stock.variant?.sku ?? stock.product.sku}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StockHealth stock={stock} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      {stock.availableStock}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {stock.safetyBuffer}
                    </td>
                    <td className="px-4 py-4 text-right text-base font-bold">
                      {stock.onlineSellableStock}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {canAdjust && (
                        <Button
                          className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground"
                          type="button"
                          onClick={() => setAdjusting(stock)}
                        >
                          Add stock
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold">Inventory looks healthy</p>
            <p className="mt-1 text-sm text-muted">
              No products are currently below their stock threshold.
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

function AlertMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "danger" | "warning";
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={`mt-2 text-3xl font-bold ${
          tone === "danger" ? "text-danger" : "text-warning-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
