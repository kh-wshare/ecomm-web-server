'use client';

import { Button, Checkbox, Input, Label, ListBox, Select } from '@heroui/react';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import {
  DevicePreviewToggle,
  PublishThemeButton,
} from './theme-builder-shared';

import type { CurrentTheme, ThemeConfig, ThemeSection } from '@/types/theme';
import { ConfirmDialog } from '@repo/ui';
import { useThemeConfig } from '@/hooks/api/use-theme';
import { usePermissions } from '@/hooks/use-permissions';
import {
  normalizeThemeConfig,
  publishTheme,
  resetThemeDraft,
  saveThemeDraft,
} from '@/lib/theme/theme-data';
import { queryKeys } from '@repo/query-client';
import { notify } from '@/lib/toast/notify';

const presets: Record<
  ThemeConfig['preset'],
  Pick<ThemeConfig, 'colors' | 'typography'>
> = {
  minimal: {
    colors: {
      primary: '#111827',
      accent: '#2563eb',
      background: '#ffffff',
      text: '#111827',
    },
    typography: { headingFont: 'Inter', bodyFont: 'Inter' },
  },
  bold: {
    colors: {
      primary: '#7c3aed',
      accent: '#f97316',
      background: '#fff7ed',
      text: '#1c1917',
    },
    typography: { headingFont: 'Space Grotesk', bodyFont: 'Inter' },
  },
  elegant: {
    colors: {
      primary: '#292524',
      accent: '#a16207',
      background: '#fafaf9',
      text: '#292524',
    },
    typography: { headingFont: 'Playfair Display', bodyFont: 'Lora' },
  },
};

export function ThemeBuilder() {
  const { can } = usePermissions();
  const canRead = can('storefront.manage');
  const themeQuery = useThemeConfig(canRead);

  if (!canRead)
    return <Notice text="You do not have permission to view themes." />;
  if (themeQuery.isPending) return <BuilderLoading />;
  if (themeQuery.isError) {
    return <Notice text={themeQuery.error.message} />;
  }

  return (
    <ThemeEditor key={themeQuery.data.updatedAt} theme={themeQuery.data} />
  );
}

function ThemeEditor({ theme }: { theme: CurrentTheme }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canUpdate = can('storefront.manage');
  const canPublish = can('storefront.manage');
  const initial = normalizeThemeConfig(theme.draftConfig);
  const live = normalizeThemeConfig(theme.liveConfig);
  const [config, setConfig] = useState(initial);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [livePreview, setLivePreview] = useState(true);
  const [showPublished, setShowPublished] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const dirty = JSON.stringify(config) !== JSON.stringify(initial);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.theme.all });
  const save = useMutation({
    mutationFn: () => saveThemeDraft(config),
    onSuccess: async () => {
      notify.success('Theme draft saved');
      await refresh();
    },
    onError: (error) => notify.error(error, 'Unable to save theme'),
  });
  const publish = useMutation({
    mutationFn: async () => {
      if (dirty) await saveThemeDraft(config);
      return publishTheme();
    },
    onSuccess: async () => {
      notify.success('Theme published');
      await refresh();
    },
    onError: (error) => notify.error(error, 'Unable to publish theme'),
  });
  const reset = useMutation({
    mutationFn: resetThemeDraft,
    onSuccess: async () => {
      notify.success('Theme draft reset');
      await refresh();
    },
    onError: (error) => notify.error(error, 'Unable to reset theme'),
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = (value: Partial<ThemeConfig>) =>
    setConfig((current) => ({ ...current, ...value }));
  const previewConfig = showPublished ? live : livePreview ? config : initial;

  return (
    <>
      <section className="space-y-5">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">Storefront</p>
            <h2 className="mt-1 text-2xl font-semibold">Theme Builder</h2>
            <p className="mt-2 text-sm text-muted">
              Design, preview, save, and publish the active storefront theme.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/storefront/settings">
              <Button size="sm" type="button" variant="secondary">
                Storefront settings
              </Button>
            </Link>
            {canUpdate && (
              <>
                <Button
                  isDisabled={reset.isPending}
                  size="sm"
                  type="button"
                  variant="secondary"
                  onPress={() => setResetOpen(true)}
                >
                  Reset
                </Button>
                <Button
                  isDisabled={!dirty || save.isPending}
                  size="sm"
                  type="button"
                  variant="primary"
                  onPress={() => save.mutate()}
                >
                  {save.isPending ? 'Saving…' : 'Save draft'}
                </Button>
              </>
            )}
            {canPublish && (
              <PublishThemeButton
                isPending={publish.isPending}
                onPublish={() => publish.mutate()}
              />
            )}
          </div>
        </header>

        {dirty && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium">
            You have unsaved theme changes.
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <div className="space-y-4">
            <Panel title="Theme preset">
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(presets) as ThemeConfig['preset'][]).map(
                  (preset) => (
                    <Button
                      className="h-10 capitalize"
                      key={preset}
                      size="sm"
                      type="button"
                      variant={
                        config.preset === preset ? 'primary' : 'secondary'
                      }
                      onPress={() => patch({ preset, ...presets[preset] })}
                    >
                      {preset}
                    </Button>
                  ),
                )}
              </div>
            </Panel>

            <Panel title="Design tokens">
              <div className="grid grid-cols-2 gap-4">
                {(
                  Object.keys(config.colors) as Array<
                    keyof ThemeConfig['colors']
                  >
                ).map((token) => (
                  <ColorTokenField
                    key={token}
                    label={token}
                    value={config.colors[token]}
                    onChange={(value) =>
                      patch({
                        colors: {
                          ...config.colors,
                          [token]: value,
                        },
                      })
                    }
                  />
                ))}
                <SelectField
                  label="Heading font"
                  value={config.typography.headingFont}
                  values={[
                    'Inter',
                    'Space Grotesk',
                    'Playfair Display',
                    'Lora',
                  ]}
                  onChange={(headingFont) =>
                    patch({
                      typography: { ...config.typography, headingFont },
                    })
                  }
                />
                <SelectField
                  label="Body font"
                  value={config.typography.bodyFont}
                  values={['Inter', 'Lora', 'System UI', 'Roboto']}
                  onChange={(bodyFont) =>
                    patch({ typography: { ...config.typography, bodyFont } })
                  }
                />
                <SelectField
                  label="Border radius"
                  value={config.layout.borderRadius}
                  values={['none', 'small', 'medium', 'large']}
                  onChange={(borderRadius) =>
                    patch({
                      layout: {
                        ...config.layout,
                        borderRadius:
                          borderRadius as ThemeConfig['layout']['borderRadius'],
                      },
                    })
                  }
                />
                <SelectField
                  label="Spacing"
                  value={config.layout.spacing}
                  values={['compact', 'comfortable', 'spacious']}
                  onChange={(spacing) =>
                    patch({
                      layout: {
                        ...config.layout,
                        spacing: spacing as ThemeConfig['layout']['spacing'],
                      },
                    })
                  }
                />
              </div>
            </Panel>

            <Panel title="Sections">
              <div className="space-y-2">
                {config.sections.map((section, index) => (
                  <div
                    className="flex cursor-grab items-center gap-3 rounded-xl border border-separator bg-background p-3"
                    draggable
                    key={section.id}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === index) return;
                      const sections = [...config.sections];
                      const [moved] = sections.splice(dragIndex, 1);
                      sections.splice(index, 0, moved);
                      patch({ sections });
                      setDragIndex(null);
                    }}
                  >
                    <span className="text-muted">⋮⋮</span>
                    <span className="flex-1 text-sm font-semibold">
                      {sectionLabel(section)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        aria-label={`Move ${sectionLabel(section)} up`}
                        isDisabled={index === 0}
                        isIconOnly
                        size="sm"
                        type="button"
                        variant="secondary"
                        onPress={() => {
                          const sections = [...config.sections];
                          [sections[index - 1], sections[index]] = [
                            sections[index],
                            sections[index - 1],
                          ];
                          patch({ sections });
                        }}
                      >
                        ↑
                      </Button>
                      <Button
                        aria-label={`Move ${sectionLabel(section)} down`}
                        isDisabled={index === config.sections.length - 1}
                        isIconOnly
                        size="sm"
                        type="button"
                        variant="secondary"
                        onPress={() => {
                          const sections = [...config.sections];
                          [sections[index], sections[index + 1]] = [
                            sections[index + 1],
                            sections[index],
                          ];
                          patch({ sections });
                        }}
                      >
                        ↓
                      </Button>
                    </div>
                    <Checkbox
                      aria-label={`Enable ${sectionLabel(section)}`}
                      isSelected={section.enabled}
                      variant="secondary"
                      onChange={(isSelected) => {
                        const sections = [...config.sections];
                        sections[index] = {
                          ...section,
                          enabled: isSelected,
                        };
                        patch({
                          sections,
                          ...(section.type === 'hero'
                            ? {
                                layout: {
                                  ...config.layout,
                                  showHero: isSelected,
                                },
                              }
                            : {}),
                        });
                      }}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                ))}
              </div>
              <SectionContent config={config} patch={patch} />
            </Panel>
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <DevicePreviewToggle device={device} onChange={setDevice} />
              <div className="flex gap-4 text-xs">
                <Checkbox
                  isSelected={livePreview}
                  variant="secondary"
                  onChange={setLivePreview}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    Live preview
                  </Checkbox.Content>
                </Checkbox>
                <Checkbox
                  isSelected={showPublished}
                  variant="secondary"
                  onChange={setShowPublished}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    Published
                  </Checkbox.Content>
                </Checkbox>
              </div>
            </div>
            <ThemePreview config={previewConfig} device={device} />
          </div>
        </div>
      </section>
      <ConfirmDialog
        confirmLabel="Reset draft"
        description="This replaces every unsaved theme setting with the default theme."
        isPending={reset.isPending}
        open={resetOpen}
        title="Reset theme draft?"
        onCancel={() => setResetOpen(false)}
        onConfirm={() =>
          reset.mutate(undefined, {
            onSuccess: () => setResetOpen(false),
          })
        }
      />
    </>
  );
}

function SectionContent({
  config,
  patch,
}: {
  config: ThemeConfig;
  patch: (value: Partial<ThemeConfig>) => void;
}) {
  const fields: Array<{
    key: 'featuredCollection' | 'socialFeed' | 'contactForm';
    label: string;
  }> = [
    { key: 'featuredCollection', label: 'Featured collection title' },
    { key: 'socialFeed', label: 'Social feed title' },
    { key: 'contactForm', label: 'Contact form title' },
  ];
  return (
    <div className="mt-4 grid gap-4 border-t border-separator pt-4">
      <TextField
        label="Hero title"
        value={config.hero.title}
        onChange={(title) => patch({ hero: { ...config.hero, title } })}
      />
      <TextField
        label="Hero subtitle"
        value={config.hero.subtitle}
        onChange={(subtitle) => patch({ hero: { ...config.hero, subtitle } })}
      />
      <TextField
        label="Hero image URL"
        value={config.hero.imageUrl}
        onChange={(imageUrl) => patch({ hero: { ...config.hero, imageUrl } })}
      />
      <GridColumnsSelect
        label="Product grid columns"
        value={config.layout.productGridColumns}
        onChange={(productGridColumns) =>
          patch({
            layout: {
              ...config.layout,
              productGridColumns,
            },
          })
        }
      />
      {fields.map(({ key, label }) => (
        <TextField
          key={key}
          label={label}
          value={config[key].title}
          onChange={(title) =>
            patch({
              [key]: { title },
            })
          }
        />
      ))}
      <TextField
        label="Footer text"
        value={config.footer.text}
        onChange={(text) => patch({ footer: { text } })}
      />
    </div>
  );
}

function ColorTokenField({
  label,
  value,
  onChange,
}: {
  label: keyof ThemeConfig['colors'];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium capitalize">
      <span>{label}</span>
      <span className="relative grid h-11 grid-cols-[44px_minmax(0,1fr)] items-center overflow-hidden rounded-xl border border-separator bg-background transition focus-within:border-accent">
        <span
          aria-hidden
          className="mx-2 size-7 rounded-lg border border-black/10 shadow-inner"
          style={{ backgroundColor: value }}
        />
        <span className="truncate pr-3 font-mono text-xs text-muted">
          {value}
        </span>
        <input
          aria-label={`${label} color`}
          className="absolute inset-0 cursor-pointer opacity-0"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function GridColumnsSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const options = [2, 3, 4, 6];
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="rounded-lg bg-surface-secondary px-2 py-1 font-mono text-xs text-muted">
          {value} grid
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-separator bg-background p-1">
        {options.map((columns) => {
          const isSelected = value === columns;

          return (
            <Button
              className={`h-9 rounded-lg px-2 text-xs font-semibold ${
                isSelected ? '' : 'bg-transparent'
              }`}
              key={columns}
              type="button"
              variant={isSelected ? 'primary' : 'tertiary'}
              onPress={() => onChange(columns)}
            >
              {columns} grid
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ThemePreview({
  config,
  device,
}: {
  config: ThemeConfig;
  device: 'mobile' | 'desktop';
}) {
  const radius = { none: '0', small: '6px', medium: '12px', large: '22px' }[
    config.layout.borderRadius
  ];
  const gap = { compact: 8, comfortable: 16, spacious: 28 }[
    config.layout.spacing
  ];
  return (
    <div className="rounded-2xl bg-surface-secondary p-4">
      <div
        className={`mx-auto min-h-[650px] overflow-hidden border border-separator shadow-xl transition-all ${
          device === 'mobile' ? 'max-w-[390px]' : 'max-w-full'
        }`}
        style={{
          background: config.colors.background,
          color: config.colors.text,
          borderRadius: radius,
          fontFamily: config.typography.bodyFont,
        }}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <strong style={{ fontFamily: config.typography.headingFont }}>
            Store
          </strong>
          <span className="text-xs">Shop · About · Contact</span>
        </div>
        {config.sections
          .filter((section) => section.enabled)
          .map((section) => (
            <PreviewSection
              config={config}
              gap={gap}
              key={section.id}
              radius={radius}
              section={section}
            />
          ))}
      </div>
    </div>
  );
}

function PreviewSection({
  config,
  gap,
  radius,
  section,
}: {
  config: ThemeConfig;
  gap: number;
  radius: string;
  section: ThemeSection;
}) {
  if (section.type === 'hero') {
    return (
      <div
        className="bg-cover bg-center px-6 py-16 text-center"
        style={{
          backgroundColor: config.colors.primary,
          backgroundImage: config.hero.imageUrl
            ? `linear-gradient(#0006,#0006),url("${config.hero.imageUrl}")`
            : undefined,
          color: config.colors.background,
        }}
      >
        <h3 className="text-3xl font-bold">{config.hero.title}</h3>
        <p className="mt-3 text-sm">{config.hero.subtitle}</p>
        <Button className="mt-5" size="sm" type="button" variant="primary">
          Shop now
        </Button>
      </div>
    );
  }
  if (section.type === 'productGrid' || section.type === 'featuredCollection') {
    const title =
      section.type === 'productGrid'
        ? 'Latest products'
        : config.featuredCollection.title;
    return (
      <div className="p-6">
        <h3 className="mb-4 text-xl font-bold">{title}</h3>
        <div
          className="grid"
          style={{
            gap,
            gridTemplateColumns: `repeat(${Math.min(
              config.layout.productGridColumns,
              4,
            )}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <div
                className="aspect-square opacity-15"
                style={{
                  background: config.colors.primary,
                  borderRadius: radius,
                }}
              />
              <p className="mt-2 text-xs font-semibold">Product {index + 1}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const content = {
    socialFeed: config.socialFeed.title,
    contactForm: config.contactForm.title,
    footer: config.footer.text,
  }[section.type];
  return (
    <div className="border-t border-black/10 p-6 text-center">
      <h3 className="font-bold">{content}</h3>
      {section.type === 'contactForm' && (
        <div className="mx-auto mt-4 h-10 max-w-sm border border-black/15" />
      )}
    </div>
  );
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium">
      <span>{label}</span>
      <Input
        className="h-10 rounded-xl border border-separator bg-background px-3 text-sm shadow-none transition focus-within:border-accent"
        value={value}
        variant="secondary"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      className="w-full"
      value={value}
      variant="secondary"
      onChange={(nextValue) => {
        if (typeof nextValue === 'string') onChange(nextValue);
      }}
    >
      <Label className="mb-1.5 block text-xs font-medium">{label}</Label>
      <Select.Trigger className="h-10 rounded-xl border border-separator bg-background px-3 text-sm shadow-none transition hover:bg-surface-secondary/50 data-[focus-visible=true]:outline data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-accent">
        <Select.Value className="truncate capitalize" />
        <Select.Indicator className="text-muted" />
      </Select.Trigger>
      <Select.Popover
        className="mt-1 min-w-[var(--trigger-width)] overflow-hidden rounded-xl border border-separator bg-surface p-1 shadow-lg"
        offset={6}
        placement="bottom start"
      >
        <ListBox className="max-h-56 overflow-y-auto">
          {values.map((item) => (
            <ListBox.Item
              className="rounded-lg px-3 py-2 text-sm outline-none transition hover:bg-surface-secondary data-[focused=true]:bg-surface-secondary"
              id={item}
              key={item}
              textValue={item}
            >
              <span className="capitalize">{item}</span>
              <ListBox.ItemIndicator className="text-accent" />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function sectionLabel(section: ThemeSection) {
  const labels: Record<ThemeSection['type'], string> = {
    hero: 'Hero banner',
    productGrid: 'Product grid',
    featuredCollection: 'Featured collection',
    socialFeed: 'Social feed',
    contactForm: 'Contact form',
    footer: 'Footer',
  };
  return labels[section.type];
}

function BuilderLoading() {
  return (
    <div className="h-[700px] rounded-2xl bg-surface-secondary animate-pulse" />
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6 text-sm">
      {text}
    </div>
  );
}
