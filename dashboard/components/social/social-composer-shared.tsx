"use client";

import type { Product } from "@/types/product";
import type { SocialPlatform } from "@/types/social";
import { Button, Input, Select } from "@/components/ui/hero-controls";
import { SOCIAL_PLATFORMS } from "@/types/social";
import { platformLabel } from "@/components/social/platform-preview";

export function PlatformSelector({
  onChange,
  value,
}: {
  onChange: (platforms: SocialPlatform[]) => void;
  value: SocialPlatform[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SOCIAL_PLATFORMS.map((platform) => {
        const checked = value.includes(platform);
        return (
          <label
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
              checked ? "border-accent bg-accent/8" : "border-separator"
            }`}
            key={platform}
          >
            <Input
              checked={checked}
              type="checkbox"
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, platform]
                    : value.filter((item) => item !== platform),
                )
              }
            />
            <span className="text-sm font-semibold">
              {platformLabel(platform)}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function MediaUploader({
  maxItems = 10,
  onChange,
  value,
}: {
  maxItems?: number;
  onChange: (urls: string[]) => void;
  value: string[];
}) {
  return (
    <div className="space-y-3">
      {value.map((url, index) => (
        <div className="flex gap-2" key={`${url}-${index}`}>
          <Input
            aria-label={`Media URL ${index + 1}`}
            className="h-11 min-w-0 flex-1 rounded-xl border border-separator bg-background px-3 text-sm"
            type="url"
            value={url}
            onChange={(event) => {
              const next = [...value];
              next[index] = event.target.value;
              onChange(next);
            }}
          />
          <Button
            className="rounded-xl border border-separator px-3 text-xs font-semibold text-danger"
            type="button"
            onClick={() =>
              onChange(value.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        className="rounded-xl border border-separator px-4 py-2 text-xs font-semibold disabled:opacity-50"
        disabled={value.length >= maxItems}
        type="button"
        onClick={() => onChange([...value, ""])}
      >
        Add media URL
      </Button>
    </div>
  );
}

export function HotspotProductSearch({
  onChange,
  products,
  value,
}: {
  onChange: (productId: string) => void;
  products: Product[];
  value: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-muted">Product</span>
      <Select
        className="h-11 w-full rounded-xl border border-separator bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a product</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} · {product.sku}
          </option>
        ))}
      </Select>
    </label>
  );
}
