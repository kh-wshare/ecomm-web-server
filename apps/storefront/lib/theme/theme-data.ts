import type { PartialThemeConfig, ThemeConfig } from "@/types/theme";

const defaultColors: ThemeConfig["colors"] = {
  accent: "#2563eb",
  background: "#ffffff",
  primary: "#111827",
  text: "#111827",
};

const defaultTypography: ThemeConfig["typography"] = {
  bodyFont: "Inter",
  headingFont: "Inter",
};

const defaultLayout: ThemeConfig["layout"] = {
  borderRadius: "medium",
  productGridColumns: 4,
  showHero: true,
  spacing: "comfortable",
};

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

export function normalizeThemeConfig(
  config: PartialThemeConfig | Record<string, unknown>,
): ThemeConfig {
  const value = config as PartialThemeConfig;

  return {
    preset: value.preset ?? "minimal",
    colors: value.colors ?? defaultColors,
    typography: value.typography ?? defaultTypography,
    layout: {
      ...defaultLayout,
      ...value.layout,
    },
    hero: {
      title: value.hero?.title ?? "Welcome to our store",
      subtitle: value.hero?.subtitle ?? "Discover products selected for you.",
      imageUrl: value.hero?.imageUrl ?? "",
    },
    sections: value.sections?.length ? value.sections : defaultSections,
    featuredCollection: {
      title: value.featuredCollection?.title ?? "Featured collection",
    },
    socialFeed: {
      title: value.socialFeed?.title ?? "Follow our story",
    },
    contactForm: {
      title: value.contactForm?.title ?? "Get in touch",
    },
    footer: {
      text: value.footer?.text ?? "Thank you for visiting.",
    },
    storefront: {
      seoTitle: value.storefront?.seoTitle ?? "",
      seoDescription: value.storefront?.seoDescription ?? "",
      logoUrl: value.storefront?.logoUrl ?? "",
      faviconUrl: value.storefront?.faviconUrl ?? "",
    },
  };
}
