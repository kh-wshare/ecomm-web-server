import type { PaginationMeta } from "@/lib/api/client";
import type { PartialThemeConfig } from "@/types/theme";

export type PublicMerchant = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
};

export type PublicProductMedia = {
  url: string;
  type: "IMAGE" | "VIDEO";
  sortOrder: number;
};

export type PublicProductVariant = {
  id: string;
  name: string;
  sku: string;
  price: string;
  attributes: Record<string, unknown>;
  isAvailable: boolean;
};

export type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: string;
  currency: string;
  channel: "WEBSITE";
  isAvailable: boolean;
  isPurchasable: boolean;
  media: PublicProductMedia[];
  variants: PublicProductVariant[];
};

export type PublicTheme = {
  version: number;
  config: PartialThemeConfig;
  publishedAt: string | null;
};

export type PublicStorefront = {
  merchant: PublicMerchant;
  theme: PublicTheme;
  featuredProducts: PublicProduct[];
};

export type PublicProductPage = {
  items: PublicProduct[];
  meta: PaginationMeta;
};

export type PublicArticle = {
  id: string;
  slug: string;
  title: string;
  content: string;
  mediaUrls: string[];
  publishedAt: string;
  hotspots: Array<{
    id: string;
    xPercent: string;
    yPercent: string;
    label: string | null;
    socialLink: string;
  }>;
};
