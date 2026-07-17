import type {
  CurrentTheme,
  MerchantProfile,
  PartialThemeConfig,
  ThemeConfig,
} from "@/types/theme";
import type { ApiResponse } from "@repo/types";

const commerceBasePath = "/merchant/api/commerce";

const defaultSections: ThemeConfig["sections"] = [
  { id: "hero", type: "hero", enabled: true },
  { id: "product-grid", type: "productGrid", enabled: true },
  {
    id: "featured-collection",
    type: "featuredCollection",
    enabled: true,
  },
  { id: "social-feed", type: "socialFeed", enabled: false },
  { id: "contact-form", type: "contactForm", enabled: false },
  { id: "footer", type: "footer", enabled: true },
];

export async function getCurrentTheme() {
  const response = await commerceRequest<ApiResponse<CurrentTheme>>(
    "/themes/current",
  );

  return response.data;
}

export async function saveThemeDraft(
  config: ThemeConfig,
  customDomain?: string | null,
) {
  const response = await commerceRequest<ApiResponse<CurrentTheme>>(
    "/themes/draft",
    {
      body: {
        config,
        ...(customDomain !== undefined ? { customDomain } : {}),
      },
      method: "PATCH",
    },
  );

  return response.data;
}

export async function publishTheme() {
  const response = await commerceRequest<ApiResponse<{
    version: number;
    config: PartialThemeConfig;
    publishedAt: string | null;
  }>>("/themes/publish", {
    method: "POST",
  });

  return response.data;
}

export async function resetThemeDraft() {
  const response = await commerceRequest<ApiResponse<CurrentTheme>>(
    "/themes/reset",
    {
      method: "POST",
    },
  );

  return response.data;
}

export async function getMerchantProfile() {
  const response = await commerceRequest<ApiResponse<MerchantProfile>>(
    "/merchant",
  );

  return response.data;
}

export async function updateMerchantProfile(values: {
  name: string;
  slug: string;
}) {
  const response = await commerceRequest<ApiResponse<MerchantProfile>>(
    "/merchant",
    {
      body: values,
      method: "PATCH",
    },
  );

  return response.data;
}

export function normalizeThemeConfig(config: PartialThemeConfig): ThemeConfig {
  return {
    preset: config.preset ?? "minimal",
    colors: config.colors,
    typography: config.typography,
    layout: {
      productGridColumns: config.layout.productGridColumns,
      showHero: config.layout.showHero,
      borderRadius: config.layout.borderRadius ?? "medium",
      spacing: config.layout.spacing ?? "comfortable",
    },
    hero: {
      title: config.hero?.title ?? "Welcome to our store",
      subtitle: config.hero?.subtitle ?? "Discover products selected for you.",
      imageUrl: config.hero?.imageUrl ?? "",
    },
    sections: config.sections?.length ? config.sections : defaultSections,
    featuredCollection: {
      title: config.featuredCollection?.title ?? "Featured collection",
    },
    socialFeed: {
      title: config.socialFeed?.title ?? "Follow our story",
    },
    contactForm: {
      title: config.contactForm?.title ?? "Get in touch",
    },
    footer: {
      text: config.footer?.text ?? "Thank you for visiting.",
    },
    storefront: {
      seoTitle: config.storefront?.seoTitle ?? "",
      seoDescription: config.storefront?.seoDescription ?? "",
      logoUrl: config.storefront?.logoUrl ?? "",
      faviconUrl: config.storefront?.faviconUrl ?? "",
    },
  };
}

async function commerceRequest<T>(
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  const response = await fetch(`${commerceBasePath}${path}`, {
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    method: options.method ?? "GET",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Theme request failed";

    throw new Error(message);
  }

  return payload as T;
}
