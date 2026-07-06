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
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          className="text-sm font-semibold"
          href={`/store/${storefront.merchant.slug}`}
          style={{ color: config.colors.accent }}
        >
          ← Back to {storefront.merchant.name}
        </Link>
        <div className="mt-7 grid gap-10 lg:grid-cols-2 lg:gap-16">
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
