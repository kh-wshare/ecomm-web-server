"use client";

import { Button, Card, Chip } from "@heroui/react";
import { useState } from "react";

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
    <div className="space-y-4">
      <Card
        className="relative aspect-square overflow-hidden"
        variant="secondary"
        style={{
          borderRadius: radiusValue(config.layout.borderRadius),
        }}
      >
        {active?.type === "IMAGE" && (
          <img
            alt={productName}
            className="size-full object-contain"
            src={active.url}
          />
        )}
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
      </Card>
      {media.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {media.map((item, index) => (
            <Button
              aria-label={`View media ${index + 1}`}
              className="aspect-square min-w-0 overflow-hidden p-0"
              variant={selected === index ? "primary" : "secondary"}
              key={`${item.url}-${index}`}
              style={{
                borderRadius: radiusValue(config.layout.borderRadius),
              }}
              type="button"
              onPress={() => setSelected(index)}
            >
              {item.type === "IMAGE" && (
                <img alt="" className="size-full object-cover" src={item.url} />
              )}
              {item.type === "VIDEO" && (
                <span className="grid size-full place-items-center">
                  <Chip size="sm" variant="soft">
                    VIDEO
                  </Chip>
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
