import Link from "next/link";

import type { PublicProduct, PublicMerchant } from "@/types/storefront";
import type { ThemeConfig } from "@/types/theme";
import { formatCurrency } from "@/lib/formatters/currency";
import { radiusValue } from "@/components/storefront/storefront-shell";

export function ProductCard({
  config,
  merchant,
  product,
}: {
  config: ThemeConfig;
  merchant: PublicMerchant;
  product: PublicProduct;
}) {
  const media = product.media[0];
  const price =
    product.variants.length > 0
      ? Math.min(...product.variants.map((variant) => Number(variant.price)))
      : Number(product.price);
  const availabilityLabel = product.isPurchasable
    ? "In stock"
    : product.isAvailable
      ? "Browsing only"
      : "Sold out";

  return (
    <Link
      className="group overflow-hidden border transition duration-300 hover:-translate-y-1 hover:shadow-xl"
      href={`/${merchant.slug}/products/${product.slug}`}
      style={{
        borderColor: `color-mix(in srgb, ${config.colors.text} 13%, transparent)`,
        borderRadius: radiusValue(config.layout.borderRadius),
      }}
    >
      <div
        className="relative aspect-[4/5] overflow-hidden bg-black/5 bg-cover bg-center transition duration-500 group-hover:scale-[1.02]"
        style={
          media?.type === "IMAGE"
            ? { backgroundImage: `url("${media.url}")` }
            : undefined
        }
      >
        {media?.type === "VIDEO" && (
          <video
            className="size-full object-cover"
            muted
            playsInline
            src={media.url}
          />
        )}
        {!media && (
          <div className="grid size-full place-items-center px-6 text-center text-sm opacity-50">
            {product.name}
          </div>
        )}
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{
            backgroundColor: product.isPurchasable
              ? config.colors.background
              : "#fee2e2",
            color: product.isPurchasable ? config.colors.text : "#b91c1c",
          }}
        >
          {availabilityLabel}
        </span>
      </div>
      <div className="p-4">
        <h3
          className="line-clamp-1 font-semibold"
          style={{
            fontFamily: `${config.typography.headingFont}, ui-sans-serif, system-ui, sans-serif`,
          }}
        >
          {product.name}
        </h3>
        <p className="mt-1 text-sm opacity-65">
          {product.variants.length ? "From " : ""}
          {formatCurrency(price, product.currency)}
        </p>
      </div>
    </Link>
  );
}
