"use client";

import { useState } from "react";

import { Button } from "@/components/ui/hero-controls";
import type { PublicProductMedia } from "@/types/storefront";
import type { ThemeConfig } from "@/types/theme";
import { radiusValue } from "@/components/storefront/storefront-shell";

export function ProductGallery({
  config,
  media,
  productName,
}: {
  config: ThemeConfig;
  media: PublicProductMedia[];
  productName: string;
}) {
  const [selected, setSelected] = useState(0);
  const active = media[selected];

  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden bg-black/5 bg-contain bg-center bg-no-repeat"
        style={{
          ...(active?.type === "IMAGE"
            ? { backgroundImage: `url("${active.url}")` }
            : {}),
          borderRadius: radiusValue(config.layout.borderRadius),
        }}
      >
        {active?.type === "VIDEO" && (
          <video
            className="size-full object-contain"
            controls
            playsInline
            src={active.url}
          />
        )}
        {!active && (
          <div className="grid size-full place-items-center px-8 text-center text-lg opacity-45">
            {productName}
          </div>
        )}
      </div>
      {media.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3">
          {media.map((item, index) => (
            <Button
              aria-label={`View media ${index + 1}`}
              className="aspect-square overflow-hidden border bg-black/5 bg-cover bg-center"
              key={`${item.url}-${index}`}
              style={{
                ...(item.type === "IMAGE"
                  ? { backgroundImage: `url("${item.url}")` }
                  : {}),
                borderColor:
                  selected === index
                    ? config.colors.accent
                    : `color-mix(in srgb, ${config.colors.text} 13%, transparent)`,
                borderRadius: radiusValue(config.layout.borderRadius),
              }}
              type="button"
              onClick={() => setSelected(index)}
            >
              <span aria-hidden="true" className="sr-only">
                {item.type === "VIDEO" ? "Video preview" : "Image preview"}
              </span>
              {item.type === "VIDEO" && (
                <span className="grid size-full place-items-center text-xs font-bold">
                  VIDEO
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
