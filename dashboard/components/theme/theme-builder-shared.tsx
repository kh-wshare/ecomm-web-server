"use client";

import { useState } from "react";

import { Button, Input } from "@/components/ui/hero-controls";
import type { ThemeConfig, ThemeSection } from "@/types/theme";

export function ThemeTokenPanel({
  config,
  onChange,
}: {
  config: ThemeConfig;
  onChange: (config: ThemeConfig) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(Object.keys(config.colors) as Array<keyof ThemeConfig["colors"]>).map(
        (token) => (
          <label className="text-xs font-medium capitalize" key={token}>
            {token}
            <span className="mt-1 flex h-10 items-center gap-2 rounded-xl border border-separator px-2">
              <Input
                className="size-6"
                type="color"
                value={config.colors[token]}
                onChange={(event) =>
                  onChange({
                    ...config,
                    colors: {
                      ...config.colors,
                      [token]: event.target.value,
                    },
                  })
                }
              />
              <span className="font-mono text-[10px]">
                {config.colors[token]}
              </span>
            </span>
          </label>
        ),
      )}
    </div>
  );
}

export function SectionEditor({
  config,
  onChange,
}: {
  config: ThemeConfig;
  onChange: (config: ThemeConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <EditorField
        label="Hero title"
        value={config.hero.title}
        onChange={(title) =>
          onChange({ ...config, hero: { ...config.hero, title } })
        }
      />
      <EditorField
        label="Hero subtitle"
        value={config.hero.subtitle}
        onChange={(subtitle) =>
          onChange({ ...config, hero: { ...config.hero, subtitle } })
        }
      />
      <EditorField
        label="Hero image URL"
        value={config.hero.imageUrl}
        onChange={(imageUrl) =>
          onChange({ ...config, hero: { ...config.hero, imageUrl } })
        }
      />
      <label className="block text-xs font-medium">
        Product grid columns
        <Input
          className="mt-1 w-full"
          max={6}
          min={1}
          type="range"
          value={config.layout.productGridColumns}
          onChange={(event) =>
            onChange({
              ...config,
              layout: {
                ...config.layout,
                productGridColumns: Number(event.target.value),
              },
            })
          }
        />
      </label>
    </div>
  );
}

export function SectionSortableList({
  onChange,
  sections,
}: {
  onChange: (sections: ThemeSection[]) => void;
  sections: ThemeSection[];
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {sections.map((section, index) => (
        <div
          className="flex cursor-grab items-center gap-3 rounded-xl border border-separator bg-background p-3"
          draggable
          key={section.id}
          onDragEnd={() => setDragIndex(null)}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (dragIndex === null || dragIndex === index) return;
            const next = [...sections];
            const [moved] = next.splice(dragIndex, 1);
            next.splice(index, 0, moved);
            onChange(next);
            setDragIndex(null);
          }}
        >
          <span className="text-muted">⋮⋮</span>
          <span className="flex-1 text-sm font-semibold">
            {sectionName(section.type)}
          </span>
          <Input
            aria-label={`Enable ${sectionName(section.type)}`}
            checked={section.enabled}
            type="checkbox"
            onChange={(event) => {
              const next = [...sections];
              next[index] = { ...section, enabled: event.target.checked };
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function StorefrontPreview({
  config,
  device,
}: {
  config: ThemeConfig;
  device: "desktop" | "mobile";
}) {
  return (
    <div className="rounded-2xl bg-surface-secondary p-4">
      <div
        className={`mx-auto min-h-[520px] overflow-hidden border border-separator shadow-xl transition-all ${
          device === "mobile" ? "max-w-[390px]" : "max-w-full"
        }`}
        style={{
          backgroundColor: config.colors.background,
          color: config.colors.text,
          fontFamily: config.typography.bodyFont,
        }}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <strong style={{ fontFamily: config.typography.headingFont }}>
            Store
          </strong>
          <span className="text-xs">Shop · Contact</span>
        </div>
        {config.layout.showHero && (
          <div
            className="bg-cover bg-center px-6 py-16 text-center text-white"
            style={{
              backgroundColor: config.colors.primary,
              backgroundImage: config.hero.imageUrl
                ? `linear-gradient(#0006,#0006),url("${config.hero.imageUrl}")`
                : undefined,
            }}
          >
            <h3 className="text-3xl font-bold">{config.hero.title}</h3>
            <p className="mt-3 text-sm">{config.hero.subtitle}</p>
          </div>
        )}
        <div className="p-6">
          <h4 className="font-semibold">{config.featuredCollection.title}</h4>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                className="aspect-[4/5] bg-black/5"
                key={index}
                style={{ borderRadius: previewRadius(config) }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DevicePreviewToggle({
  device,
  onChange,
}: {
  device: "desktop" | "mobile";
  onChange: (device: "desktop" | "mobile") => void;
}) {
  return (
    <div className="flex gap-2" role="group" aria-label="Preview device">
      {(["mobile", "desktop"] as const).map((mode) => (
        <Button
          aria-pressed={device === mode}
          className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize ${
            device === mode
              ? "bg-accent text-accent-foreground"
              : "border border-separator"
          }`}
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
        >
          {mode}
        </Button>
      ))}
    </div>
  );
}

export function PublishThemeButton({
  isPending,
  onPublish,
}: {
  isPending: boolean;
  onPublish: () => void;
}) {
  return (
    <Button
      className="rounded-xl bg-success px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      disabled={isPending}
      type="button"
      onClick={onPublish}
    >
      {isPending ? "Publishing…" : "Publish"}
    </Button>
  );
}

function EditorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <Input
        className="mt-1 h-10 w-full rounded-xl border border-separator bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function sectionName(value: ThemeSection["type"]) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function previewRadius(config: ThemeConfig) {
  return {
    none: "0",
    small: "6px",
    medium: "12px",
    large: "22px",
  }[config.layout.borderRadius];
}
