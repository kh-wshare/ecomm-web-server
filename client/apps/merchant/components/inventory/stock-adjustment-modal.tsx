"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button, Input, Select } from "@/components/products/product-controls";
import type {
  AdjustableStock,
  InventoryAdjustmentValues,
} from "@/types/inventory";
import { adjustInventory } from "@/lib/inventory/inventory-data";
import { queryKeys } from "@repo/query-client";
import { notify } from "@/lib/toast/notify";
import { validateForm } from "@/lib/validation/form";
import { inventoryAdjustmentSchema } from "@/lib/validation/inventory";

export function StockAdjustmentModal({
  stock,
  onClose,
}: {
  stock: AdjustableStock;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<InventoryAdjustmentValues>({
    type: "STOCK_IN",
    quantity: "",
    safetyBuffer: String(stock.safetyBuffer),
    reason: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: () => adjustInventory(stock, values),
    onSuccess: async () => {
      notify.success(
        "Inventory updated",
        `${stock.product.name} stock is current.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.merchant.dashboard(),
        }),
      ]);
      onClose();
    },
    onError: (error) => {
      setConfirming(false);
      notify.error(error, "Unable to adjust stock");
    },
  });

  const validate = () => {
    const result = validateForm(inventoryAdjustmentSchema, values);

    if (!result.success) {
      setErrors(result.errors);

      return;
    }

    if (
      result.data.type === "STOCK_OUT" &&
      Number(result.data.quantity) > stock.availableStock
    ) {
      setErrors({
        quantity: [
          `Only ${stock.availableStock} unreserved unit${
            stock.availableStock === 1 ? " is" : "s are"
          } available`,
        ],
      });

      return;
    }

    setErrors({});
    setConfirming(true);
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !mutation.isPending)
          onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-separator bg-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Adjust stock</h2>
            <p className="mt-1 text-sm text-muted">
              {stock.product.name}
              {stock.variant ? ` · ${stock.variant.name}` : ""} (
              {stock.variant?.sku ?? stock.product.sku})
            </p>
          </div>
          <Button
            aria-label="Close stock adjustment"
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-secondary"
            disabled={mutation.isPending}
            type="button"
            onClick={onClose}
          >
            ×
          </Button>
        </div>

        {!confirming ? (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Adjustment type
              </span>
              <Select
                className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
                value={values.type}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    type: event.target
                      .value as InventoryAdjustmentValues["type"],
                  }))
                }
              >
                <option value="STOCK_IN">Stock in</option>
                <option value="STOCK_OUT">Stock out</option>
              </Select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModalField
                error={errors.quantity?.[0]}
                label="Quantity"
                placeholder="10"
                value={values.quantity}
                onChange={(quantity) =>
                  setValues((current) => ({ ...current, quantity }))
                }
              />
              <ModalField
                error={errors.safetyBuffer?.[0]}
                label="Safety buffer"
                placeholder="0"
                value={values.safetyBuffer}
                onChange={(safetyBuffer) =>
                  setValues((current) => ({ ...current, safetyBuffer }))
                }
              />
            </div>
            <ModalField
              error={errors.reason?.[0]}
              label="Reason"
              maxLength={120}
              placeholder="New shipment received"
              value={values.reason}
              onChange={(reason) =>
                setValues((current) => ({ ...current, reason }))
              }
            />
            <div className="rounded-xl bg-surface-secondary p-3 text-xs text-muted">
              Current: {stock.totalStock} total, {stock.reservedStock} reserved,{" "}
              {stock.onlineSellableStock} online sellable.
            </div>
            <div className="flex justify-end gap-3">
              <Button
                className="h-10 rounded-xl border border-separator px-4 text-sm font-semibold"
                type="button"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
                type="button"
                onClick={validate}
              >
                Review adjustment
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="font-semibold">Confirm inventory change</p>
              <p className="mt-2 text-sm text-muted">
                {values.type === "STOCK_IN" ? "Add" : "Remove"}{" "}
                <strong>{values.quantity}</strong> unit
                {Number(values.quantity) === 1 ? "" : "s"} and set the safety
                buffer to <strong>{values.safetyBuffer}</strong>.
              </p>
              <p className="mt-2 text-xs text-muted">Reason: {values.reason}</p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                className="h-10 rounded-xl border border-separator px-4 text-sm font-semibold"
                disabled={mutation.isPending}
                type="button"
                onClick={() => setConfirming(false)}
              >
                Back
              </Button>
              <Button
                className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-60"
                disabled={mutation.isPending}
                type="button"
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Updating…" : "Confirm adjustment"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalField({
  error,
  label,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  error?: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <Input
        {...props}
        aria-invalid={Boolean(error)}
        className={`h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none ${
          error ? "border-danger" : "border-separator focus:border-accent"
        }`}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
