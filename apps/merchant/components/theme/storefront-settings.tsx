"use client";

import { Button, Form, Input, TextArea } from "@heroui/react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import type { CurrentTheme, MerchantProfile } from "@/types/theme";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getCurrentTheme,
  getMerchantProfile,
  normalizeThemeConfig,
  saveThemeDraft,
  updateMerchantProfile,
} from "@/lib/theme/theme-data";
import { queryKeys } from "@repo/query-client";
import { notify } from "@/lib/toast/notify";
import { storefrontSettingsSchema } from "@/lib/validation/storefront-settings";
import { validateForm } from "@/lib/validation/form";

type SettingsValues = {
  name: string;
  slug: string;
  customDomain: string;
  seoTitle: string;
  seoDescription: string;
  logoUrl: string;
  faviconUrl: string;
};

export function StorefrontSettings() {
  const { can } = usePermissions();
  const canRead = can("storefront.manage");
  const merchantQuery = useQuery({
    queryKey: queryKeys.merchant.profile(),
    queryFn: getMerchantProfile,
    enabled: canRead,
  });
  const themeQuery = useQuery({
    queryKey: queryKeys.theme.current(),
    queryFn: getCurrentTheme,
    enabled: canRead,
  });

  if (!canRead) {
    return <Notice text="Storefront management permission is required." />;
  }
  if (merchantQuery.isPending || themeQuery.isPending) {
    return (
      <div className="h-[600px] rounded-2xl bg-surface-secondary animate-pulse" />
    );
  }
  if (merchantQuery.isError || themeQuery.isError) {
    return (
      <Notice
        text={
          merchantQuery.error?.message ??
          themeQuery.error?.message ??
          "Settings are unavailable."
        }
      />
    );
  }

  return (
    <SettingsForm
      key={`${merchantQuery.data.updatedAt}-${themeQuery.data.updatedAt}`}
      merchant={merchantQuery.data}
      theme={themeQuery.data}
    />
  );
}

function SettingsForm({
  merchant,
  theme,
}: {
  merchant: MerchantProfile;
  theme: CurrentTheme;
}) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canSave = can("storefront.manage");
  const config = normalizeThemeConfig(theme.draftConfig);
  const [values, setValues] = useState<SettingsValues>({
    name: merchant.name,
    slug: merchant.slug,
    customDomain: theme.customDomain ?? "",
    seoTitle: config.storefront.seoTitle,
    seoDescription: config.storefront.seoDescription,
    logoUrl: config.storefront.logoUrl,
    faviconUrl: config.storefront.faviconUrl,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const save = useMutation({
    mutationFn: async (validated: SettingsValues) => {
      const nextConfig = {
        ...config,
        storefront: {
          seoTitle: validated.seoTitle.trim(),
          seoDescription: validated.seoDescription.trim(),
          logoUrl: validated.logoUrl.trim(),
          faviconUrl: validated.faviconUrl.trim(),
        },
      };
      await updateMerchantProfile({
        name: validated.name.trim(),
        slug: validated.slug.trim(),
      });
      await saveThemeDraft(nextConfig, validated.customDomain.trim() || null);
    },
    onSuccess: async () => {
      notify.success(
        "Storefront settings saved",
        "Publish the theme when you are ready to make SEO and assets live.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.merchant.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.theme.all }),
      ]);
    },
    onError: (error) => notify.error(error, "Unable to save settings"),
  });
  const update = (field: keyof SettingsValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  return (
    <Form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const result = validateForm(storefrontSettingsSchema, values);
        if (!result.success) {
          setErrors(result.errors);
          notify.warning("Check the highlighted settings");
          return;
        }
        save.mutate(result.data);
      }}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-accent hover:underline"
            href="/storefront/theme"
          >
            ← Theme Builder
          </Link>
          <h2 className="mt-2 text-2xl font-semibold">Storefront settings</h2>
          <p className="mt-2 text-sm text-muted">
            Identity, domain, search metadata, and hosted brand assets.
          </p>
        </div>
        {canSave && (
          <Button isDisabled={save.isPending} type="submit" variant="primary">
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        )}
      </header>

      {!canSave && (
        <Notice text="Storefront management permission is required to save." />
      )}

      <SettingsPanel
        description="Used throughout the dashboard and public storefront URL."
        title="Store identity"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={errors.name?.[0]}
            label="Store name"
            value={values.name}
            onChange={(value) => update("name", value)}
          />
          <Field
            error={errors.slug?.[0]}
            label="Store slug"
            value={values.slug}
            onChange={(value) => update("slug", value)}
          />
          <Field
            className="sm:col-span-2"
            error={errors.customDomain?.[0]}
            label="Custom domain"
            placeholder="shop.example.com"
            value={values.customDomain}
            onChange={(value) => update("customDomain", value)}
          />
        </div>
      </SettingsPanel>

      <SettingsPanel
        description="Metadata used by search engines and link previews."
        title="Search engine optimization"
      >
        <div className="space-y-4">
          <Field
            error={errors.seoTitle?.[0]}
            label="SEO title"
            maxLength={70}
            value={values.seoTitle}
            onChange={(value) => update("seoTitle", value)}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              SEO description
            </span>
            <TextArea
              className="min-h-24"
              maxLength={160}
              variant="secondary"
              value={values.seoDescription}
              onChange={(event) => update("seoDescription", event.target.value)}
            />
            <span className="mt-1 block text-right text-[10px] text-muted">
              {values.seoDescription.length}/160
            </span>
          </label>
        </div>
      </SettingsPanel>

      <SettingsPanel
        description="Add publicly hosted asset URLs. Binary media storage is not configured."
        title="Brand assets"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <AssetField
            error={errors.logoUrl?.[0]}
            label="Logo URL"
            value={values.logoUrl}
            onChange={(value) => update("logoUrl", value)}
          />
          <AssetField
            error={errors.faviconUrl?.[0]}
            label="Favicon URL"
            value={values.faviconUrl}
            onChange={(value) => update("faviconUrl", value)}
          />
        </div>
      </SettingsPanel>
    </Form>
  );
}

function SettingsPanel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-separator bg-surface p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-5 mt-1 text-xs text-muted">{description}</p>
      {children}
    </section>
  );
}

function Field({
  error,
  label,
  onChange,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  error?: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <Input
        {...props}
        aria-invalid={Boolean(error) || undefined}
        variant="secondary"
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

function AssetField({
  error,
  label,
  value,
  onChange,
}: {
  error?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div
        className="mb-3 h-28 rounded-xl bg-surface-secondary bg-contain bg-center bg-no-repeat ring-1 ring-separator"
        style={value ? { backgroundImage: `url("${value}")` } : undefined}
      />
      <Field
        error={error}
        label={label}
        placeholder="https://cdn.example.com/brand.png"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
      {text}
    </div>
  );
}
