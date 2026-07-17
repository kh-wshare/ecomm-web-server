"use client";

import { Button, Checkbox, Input } from "@heroui/react";

import type { Product } from "@/types/product";
import type { SocialPlatform } from "@/types/social";
import { Select } from "@/components/products/product-controls";
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
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-separator p-4"
            key={platform}
          >
            <Checkbox
              isSelected={checked}
              onChange={(nextChecked) =>
                onChange(
                  nextChecked
                    ? [...value, platform]
                    : value.filter((item) => item !== platform),
                )
              }
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
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
            size="sm"
            type="button"
            variant="danger-soft"
            onPress={() =>
              onChange(value.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        isDisabled={value.length >= maxItems}
        size="sm"
        type="button"
        variant="secondary"
        onPress={() => onChange([...value, ""])}
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
