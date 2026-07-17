"use client";

import type {
  ProductFormChannel,
  ProductFormMedia,
  ProductFormVariant,
} from "@/types/product";
import { Button, Input, Select } from "./product-controls";
import type { VariantStatus } from "@/types/product";
import { FileUploader } from "@/components/products/file-uploader";
import { StatusBadge } from "@repo/ui";
import { VARIANT_STATUSES } from "@/types/product";

export function ProductVariantEditor({
  errors = {},
  onChange,
  variants,
}: {
  errors?: Record<string, string>;
  onChange: (variants: ProductFormVariant[]) => void;
  variants: ProductFormVariant[];
}) {
  const update = (
    index: number,
    field: keyof ProductFormVariant,
    value: string,
  ) => {
    const next = [...variants];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {variants.map((variant, index) => (
        <div
          className="rounded-xl border border-separator bg-background p-4"
          key={variant.key}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Variant {index + 1}</p>
            <Button
              className="text-xs font-semibold text-danger"
              type="button"
              onClick={() =>
                onChange(variants.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <EditorInput
              error={errors[`variants.${index}.name`]}
              label="Name"
              value={variant.name}
              onChange={(value) => update(index, "name", value)}
            />
            <EditorInput
              error={errors[`variants.${index}.sku`]}
              label="SKU"
              value={variant.sku}
              onChange={(value) => update(index, "sku", value)}
            />
            <EditorInput
              error={errors[`variants.${index}.price`]}
              label="Price"
              value={variant.price}
              onChange={(value) => update(index, "price", value)}
            />
            <EditorInput
              error={errors[`variants.${index}.attributes`]}
              label="Attributes (JSON)"
              value={variant.attributes}
              onChange={(value) => update(index, "attributes", value)}
            />
            <label>
              <span className="mb-1.5 block text-sm font-medium">Status</span>
              <Select
                className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
                value={variant.status}
                onChange={(event) =>
                  update(index, "status", event.target.value as VariantStatus)
                }
              >
                {VARIANT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {label(status)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductImageUploader({
  media,
  onChange,
  onFilesSelected,
}: {
  media: ProductFormMedia[];
  onChange: (media: ProductFormMedia[]) => void;
  onFilesSelected?: (files: File[]) => void;
}) {
  return (
    <div className="space-y-4">
      {onFilesSelected && (
        <FileUploader
          label="Add product images or videos"
          onFiles={onFilesSelected}
        />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {media.map((item, index) => (
          <div
            className="flex gap-3 rounded-xl border border-separator bg-background p-3"
            key={item.key}
          >
            <div
              className="grid size-20 shrink-0 place-items-center rounded-lg bg-surface-secondary bg-cover bg-center text-[10px] font-bold text-muted"
              style={
                item.type === "IMAGE" && item.url
                  ? { backgroundImage: `url("${item.url}")` }
                  : undefined
              }
            >
              {item.type === "VIDEO" ? "VIDEO" : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex gap-2">
                <Select
                  aria-label={`Media ${index + 1} type`}
                  className="h-10 rounded-lg border border-separator bg-background px-2 text-xs"
                  value={item.type}
                  onChange={(event) => {
                    const next = [...media];
                    next[index] = {
                      ...item,
                      type: event.target.value as "IMAGE" | "VIDEO",
                    };
                    onChange(next);
                  }}
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </Select>
                <Input
                  aria-label={`Media ${index + 1} URL`}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-separator bg-background px-2 text-xs"
                  placeholder="https://…"
                  type="url"
                  value={item.url}
                  onChange={(event) => {
                    const next = [...media];
                    next[index] = { ...item, url: event.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <Button
                className="mt-2 text-xs font-semibold text-danger"
                type="button"
                onClick={() =>
                  onChange(media.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChannelVisibilitySelector({
  channels,
  onChange,
}: {
  channels: ProductFormChannel[];
  onChange: (channels: ProductFormChannel[]) => void;
}) {
  const update = (
    index: number,
    value: Partial<Pick<ProductFormChannel, "isPurchasable" | "isVisible">>,
  ) => {
    const next = [...channels];
    next[index] = { ...next[index], ...value };
    onChange(next);
  };

  return (
    <div className="divide-y divide-separator rounded-xl border border-separator bg-background">
      {channels.map((item, index) => (
        <div
          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          key={item.channel}
        >
          <p className="text-sm font-semibold">{label(item.channel)}</p>
          <div className="flex gap-5">
            <Toggle
              checked={item.isVisible}
              label="Visible"
              onChange={(checked) =>
                update(index, {
                  isVisible: checked,
                  isPurchasable: checked ? item.isPurchasable : false,
                })
              }
            />
            <Toggle
              checked={item.isPurchasable}
              label="Purchasable"
              onChange={(checked) =>
                update(index, {
                  isPurchasable: checked,
                  isVisible: checked || item.isVisible,
                })
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SafetyBufferInput({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <EditorInput
      error={error}
      label="Safety buffer"
      min="0"
      placeholder="0"
      type="number"
      value={value}
      onChange={onChange}
    />
  );
}

export function StockStatusBadge({
  availableStock,
  onlineSellableStock,
  safetyBuffer,
}: {
  availableStock: number;
  onlineSellableStock: number;
  safetyBuffer: number;
}) {
  if (onlineSellableStock <= 0) {
    return <StatusBadge status="OUT_OF_STOCK">OUT OF STOCK</StatusBadge>;
  }
  if (safetyBuffer > 0 && availableStock <= safetyBuffer) {
    return <StatusBadge status="LOW_STOCK">LOW STOCK</StatusBadge>;
  }
  return <StatusBadge status="ACTIVE">HEALTHY</StatusBadge>;
}

function EditorInput({
  error,
  label: inputLabel,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  error?: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{inputLabel}</span>
      <Input
        {...props}
        className={`h-11 w-full rounded-xl border bg-background px-3 text-sm ${
          error ? "border-danger" : "border-separator"
        }`}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

function Toggle({
  checked,
  label: toggleLabel,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium">
      <Input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {toggleLabel}
    </label>
  );
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
