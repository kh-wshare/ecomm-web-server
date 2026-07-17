export const THEME_SECTION_TYPES = [
  "hero",
  "productGrid",
  "featuredCollection",
  "socialFeed",
  "contactForm",
  "footer",
] as const;

export type ThemeSectionType = (typeof THEME_SECTION_TYPES)[number];

export type ThemeSection = {
  id: string;
  type: ThemeSectionType;
  enabled: boolean;
};

export type ThemeConfig = {
  preset: "minimal" | "bold" | "elegant";
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  layout: {
    productGridColumns: number;
    showHero: boolean;
    borderRadius: "none" | "small" | "medium" | "large";
    spacing: "compact" | "comfortable" | "spacious";
  };
  hero: {
    title: string;
    subtitle: string;
    imageUrl: string;
  };
  sections: ThemeSection[];
  featuredCollection: { title: string };
  socialFeed: { title: string };
  contactForm: { title: string };
  footer: { text: string };
  storefront: {
    seoTitle: string;
    seoDescription: string;
    logoUrl: string;
    faviconUrl: string;
  };
};

export type PartialThemeConfig = {
  preset?: ThemeConfig["preset"];
  colors?: ThemeConfig["colors"];
  typography?: ThemeConfig["typography"];
  layout?: Partial<ThemeConfig["layout"]>;
  hero?: Partial<ThemeConfig["hero"]>;
  sections?: ThemeSection[];
  featuredCollection?: Partial<ThemeConfig["featuredCollection"]>;
  socialFeed?: Partial<ThemeConfig["socialFeed"]>;
  contactForm?: Partial<ThemeConfig["contactForm"]>;
  footer?: Partial<ThemeConfig["footer"]>;
  storefront?: Partial<ThemeConfig["storefront"]>;
};
