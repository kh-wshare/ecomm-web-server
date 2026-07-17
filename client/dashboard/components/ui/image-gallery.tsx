"use client";

import { useState } from "react";

import { Button } from "@/components/ui/hero-controls";

export type GalleryMedia = {
  type: "IMAGE" | "VIDEO";
  url: string;
};

export function ImageGallery({
  emptyLabel = "No media available",
  media,
}: {
  emptyLabel?: string;
  media: GalleryMedia[];
}) {
  const [selected, setSelected] = useState(0);
  const active = media[selected];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-secondary bg-contain bg-center bg-no-repeat">
        {active?.type === "IMAGE" && (
          <div
            aria-label={`Media ${selected + 1}`}
            className="size-full bg-contain bg-center bg-no-repeat"
            role="img"
            style={{ backgroundImage: `url("${active.url}")` }}
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
          <div className="grid size-full place-items-center text-sm text-muted">
            {emptyLabel}
          </div>
        )}
      </div>
      {media.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {media.map((item, index) => (
            <Button
              aria-label={`View media ${index + 1}`}
              className={`aspect-square overflow-hidden rounded-lg border bg-surface-secondary bg-cover bg-center ${
                selected === index ? "border-accent" : "border-separator"
              }`}
              key={`${item.url}-${index}`}
              style={
                item.type === "IMAGE"
                  ? { backgroundImage: `url("${item.url}")` }
                  : undefined
              }
              type="button"
              onClick={() => setSelected(index)}
            >
              {item.type === "VIDEO" && (
                <span className="text-[10px] font-bold">VIDEO</span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
