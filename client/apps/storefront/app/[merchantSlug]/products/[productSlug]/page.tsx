import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontProductDetail } from "@/components/storefront/storefront-product-detail";
import {
  getPublicProduct,
  getPublicStorefront,
} from "@/lib/storefront/storefront-data";
import { isStorefrontSlug } from "@/lib/storefront/slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ merchantSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { merchantSlug, productSlug } = await params;

  if (!isStorefrontSlug(merchantSlug)) {
    return { title: "Product unavailable" };
  }

  try {
    const product = await getPublicProduct(merchantSlug, productSlug);

    return {
      description: product.description?.slice(0, 160),
      title: product.name,
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

  if (!isStorefrontSlug(merchantSlug)) notFound();

  const [storefront, product] = await Promise.all([
    getPublicStorefront(merchantSlug),
    getPublicProduct(merchantSlug, productSlug),
  ]);

  return <StorefrontProductDetail product={product} storefront={storefront} />;
}
