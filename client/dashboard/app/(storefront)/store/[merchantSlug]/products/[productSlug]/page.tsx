import type { Metadata } from "next";

import { StorefrontProductDetail } from "@/components/storefront/storefront-product-detail";
import {
  getPublicProduct,
  getPublicStorefront,
} from "@/lib/storefront/storefront-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ merchantSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { merchantSlug, productSlug } = await params;

  try {
    const product = await getPublicProduct(merchantSlug, productSlug);
    return {
      title: product.name,
      description: product.description?.slice(0, 160),
    };
  } catch {
    return { title: "Product unavailable" };
  }
}

export default async function StorefrontProductPage({
  params,
}: {
  params: Promise<{ merchantSlug: string; productSlug: string }>;
}) {
  const { merchantSlug, productSlug } = await params;
  const [storefront, product] = await Promise.all([
    getPublicStorefront(merchantSlug),
    getPublicProduct(merchantSlug, productSlug),
  ]);

  return <StorefrontProductDetail product={product} storefront={storefront} />;
}
