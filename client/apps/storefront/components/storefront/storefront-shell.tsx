import type { CSSProperties } from "react";
import Link from "next/link";

import type { PublicMerchant } from "@/types/storefront";
import type { ThemeConfig } from "@/types/theme";
import { StorefrontCustomerAuth } from "@/components/storefront/storefront-customer-auth";

type StorefrontStyle = CSSProperties & {
  "--store-accent": string;
  "--store-background": string;
  "--store-primary": string;
  "--store-text": string;
};

export function StorefrontShell({
  children,
  config,
  merchant,
}: {
  children: React.ReactNode;
  config: ThemeConfig;
  merchant: PublicMerchant;
}) {
  const style: StorefrontStyle = {
    "--store-accent": config.colors.accent,
    "--store-background": config.colors.background,
    "--store-primary": config.colors.primary,
    "--store-text": config.colors.text,
    backgroundColor: config.colors.background,
    color: config.colors.text,
    fontFamily: `${config.typography.bodyFont}, ui-sans-serif, system-ui, sans-serif`,
  };

  return (
    <div className="min-h-dvh" style={style}>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          backgroundColor: `color-mix(in srgb, ${config.colors.background} 88%, transparent)`,
          borderColor: `color-mix(in srgb, ${config.colors.text} 14%, transparent)`,
        }}
      >
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <Link
            className="flex min-w-0 items-center gap-3"
            href={`/${merchant.slug}`}
          >
            {config.storefront.logoUrl ? (
              <span
                aria-label={merchant.name}
                className="block h-10 w-32 bg-contain bg-left bg-no-repeat"
                role="img"
                style={{
                  backgroundImage: `url("${config.storefront.logoUrl}")`,
                }}
              />
            ) : (
              <span
                className="grid size-10 shrink-0 place-items-center font-black text-white"
                style={{
                  backgroundColor: config.colors.primary,
                  borderRadius: radiusValue(config.layout.borderRadius),
                }}
              >
                {merchant.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span
              className="truncate text-base font-semibold"
              style={{
                fontFamily: `${config.typography.headingFont}, ui-sans-serif, system-ui, sans-serif`,
              }}
            >
              {merchant.name}
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href={`/${merchant.slug}#products`}>Shop</Link>
            {merchant.email && (
              <a className="hidden sm:inline" href={`mailto:${merchant.email}`}>
                Contact
              </a>
            )}
            <StorefrontCustomerAuth />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

export function radiusValue(radius: ThemeConfig["layout"]["borderRadius"]) {
  return {
    none: "0",
    small: "0.5rem",
    medium: "1rem",
    large: "1.75rem",
  }[radius];
}
