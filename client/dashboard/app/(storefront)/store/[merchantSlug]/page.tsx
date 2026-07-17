import type { Metadata } from "next";

import { StorefrontHome } from "@/components/storefront/storefront-home";
import {
  getPublicArticles,
  getPublicProducts,
  getPublicStorefront,
} from "@/lib/storefront/storefront-data";
import { normalizeThemeConfig } from "@/lib/theme/theme-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ merchantSlug: string }>;
}): Promise<Metadata> {
  const { merchantSlug } = await params;

  try {
    const storefront = await getPublicStorefront(merchantSlug);
    const config = normalizeThemeConfig(storefront.theme.config);

    return {
      title: config.storefront.seoTitle || storefront.merchant.name,
      description:
        config.storefront.seoDescription ||
        `Shop the latest products from ${storefront.merchant.name}.`,
      icons: config.storefront.faviconUrl
        ? { icon: config.storefront.faviconUrl }
        : undefined,
    };
  } catch {
    return { title: "Store unavailable" };
  }
}

export default async function MerchantStorefrontPage({
  params,
}: {
  params: Promise<{ merchantSlug: string }>;
}) {
  const { merchantSlug } = await params;
  const [storefront, products, articles] = await Promise.all([
    getPublicStorefront(merchantSlug),
    getPublicProducts(merchantSlug),
    getPublicArticles(merchantSlug),
  ]);

  return (
    <StorefrontHome
      articles={articles}
      products={products.items}
      storefront={storefront}
    />
  );
}
