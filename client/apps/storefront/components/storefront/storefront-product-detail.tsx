import Link from "next/link";

import type { PublicProduct, PublicStorefront } from "@/types/storefront";
import { normalizeThemeConfig } from "@/lib/theme/theme-data";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { PurchasePanel } from "@/components/storefront/purchase-panel";
import { StorefrontShell } from "@/components/storefront/storefront-shell";

export function StorefrontProductDetail({
  product,
  storefront,
}: {
  product: PublicProduct;
  storefront: PublicStorefront;
}) {
  const config = normalizeThemeConfig(storefront.theme.config);

  return (
    <StorefrontShell config={config} merchant={storefront.merchant}>
      <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
        <Link
          className="inline-flex text-sm font-semibold"
          href={`/${storefront.merchant.slug}`}
          style={{ color: config.colors.accent }}
        >
          ← Back to {storefront.merchant.name}
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-12">
          <ProductGallery
            config={config}
            media={product.media}
            productName={product.name}
          />
          <PurchasePanel
            config={config}
            merchantSlug={storefront.merchant.slug}
            product={product}
          />
        </div>
      </main>
    </StorefrontShell>
  );
}
