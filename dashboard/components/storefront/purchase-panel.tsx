"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button, Input } from "@/components/ui/hero-controls";
import type { PublicProduct } from "@/types/storefront";
import type { ThemeConfig } from "@/types/theme";
import { env } from "@/config/env";
import { createCheckoutSession } from "@/lib/checkout/checkout-data";
import { checkoutStorage } from "@/lib/checkout/checkout-storage";
import { formatCurrency } from "@/lib/formatters/currency";
import { getErrorMessage } from "@/lib/errors/api-error";
import { radiusValue } from "@/components/storefront/storefront-shell";
import { storefrontCustomerSession } from "@/lib/storefront/customer-session";

export function PurchasePanel({
  config,
  merchantSlug,
  product,
}: {
  config: ThemeConfig;
  merchantSlug: string;
  product: PublicProduct;
}) {
  const router = useRouter();
  const firstAvailableVariant = product.variants.find(
    (variant) => variant.isAvailable,
  );
  const [variantId, setVariantId] = useState(firstAvailableVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const selectedVariant = product.variants.find(
    (variant) => variant.id === variantId,
  );
  const hasVariants = product.variants.length > 0;
  const selectedTargetAvailable = selectedVariant
    ? selectedVariant.isAvailable
    : product.baseIsAvailable;
  const canBuy =
    product.isAvailable && product.isPurchasable && selectedTargetAvailable;
  const price = selectedVariant?.price ?? product.price;
  const checkout = useMutation({
    mutationFn: () => {
      const customer = storefrontCustomerSession.get()?.user;
      return createCheckoutSession({
        merchantSlug,
        ...(customer
          ? {
              customerEmail: customer.email,
              customerId: customer.id,
              customerName: customer.fullName,
              ...(customer.phone ? { customerPhone: customer.phone } : {}),
            }
          : {}),
        sourceChannel: "WEBSITE",
        items: [
          {
            productId: product.id,
            ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
            quantity,
          },
        ],
      });
    },
    onSuccess: (session) => {
      checkoutStorage.set(session.id, {
        token: session.checkoutToken,
        merchantSlug,
        productSlug: product.slug,
      });
      router.push(`/checkout/${session.id}`);
    },
  });
  const shareUrl = `${env.NEXT_PUBLIC_STOREFRONT_URL}/store/${merchantSlug}/products/${product.slug}`;

  return (
    <div>
      <p className="text-sm font-medium opacity-55">{product.sku}</p>
      <h1
        className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl"
        style={{
          fontFamily: `${config.typography.headingFont}, ui-sans-serif, system-ui, sans-serif`,
        }}
      >
        {product.name}
      </h1>
      <p className="mt-5 text-2xl font-semibold">
        {formatCurrency(price, product.currency)}
      </p>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span
          className="size-2.5 rounded-full"
          style={{
            backgroundColor: canBuy ? "#16a34a" : "#dc2626",
          }}
        />
        <span className="font-medium">
          {canBuy ? "In stock and ready to order" : "Currently unavailable"}
        </span>
      </div>

      {product.description && (
        <p className="mt-7 whitespace-pre-wrap text-base leading-7 opacity-70">
          {product.description}
        </p>
      )}

      {hasVariants && (
        <fieldset className="mt-8">
          <legend className="text-sm font-semibold">Choose an option</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button
              className="flex items-center justify-between gap-3 border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!product.baseIsAvailable}
              style={{
                backgroundColor: !selectedVariant
                  ? `color-mix(in srgb, ${config.colors.accent} 10%, transparent)`
                  : "transparent",
                borderColor: !selectedVariant
                  ? config.colors.accent
                  : `color-mix(in srgb, ${config.colors.text} 15%, transparent)`,
                borderRadius: radiusValue(config.layout.borderRadius),
              }}
              type="button"
              onClick={() => setVariantId("")}
            >
              <span>
                <span className="block font-semibold">{product.name}</span>
                <span className="mt-0.5 block text-xs opacity-55">
                  {product.baseIsAvailable ? product.sku : "Sold out"}
                </span>
              </span>
              <span className="font-semibold">
                {formatCurrency(product.price, product.currency)}
              </span>
            </Button>
            {product.variants.map((variant) => {
              const selected = variant.id === variantId;
              return (
                <Button
                  className="flex items-center justify-between gap-3 border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!variant.isAvailable}
                  key={variant.id}
                  style={{
                    backgroundColor: selected
                      ? `color-mix(in srgb, ${config.colors.accent} 10%, transparent)`
                      : "transparent",
                    borderColor: selected
                      ? config.colors.accent
                      : `color-mix(in srgb, ${config.colors.text} 15%, transparent)`,
                    borderRadius: radiusValue(config.layout.borderRadius),
                  }}
                  type="button"
                  onClick={() => setVariantId(variant.id)}
                >
                  <span>
                    <span className="block font-semibold">{variant.name}</span>
                    <span className="mt-0.5 block text-xs opacity-55">
                      {variant.isAvailable ? variant.sku : "Sold out"}
                    </span>
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(variant.price, product.currency)}
                  </span>
                </Button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <label>
          <span className="sr-only">Quantity</span>
          <span
            className="flex h-12 items-center overflow-hidden border"
            style={{
              borderColor: `color-mix(in srgb, ${config.colors.text} 15%, transparent)`,
              borderRadius: radiusValue(config.layout.borderRadius),
            }}
          >
            <Button
              aria-label="Decrease quantity"
              className="size-12 text-lg"
              disabled={quantity <= 1}
              type="button"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            >
              −
            </Button>
            <Input
              aria-label="Quantity"
              className="h-full w-12 bg-transparent text-center text-sm font-semibold outline-none"
              max="100"
              min="1"
              type="number"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  Math.min(100, Math.max(1, Number(event.target.value) || 1)),
                )
              }
            />
            <Button
              aria-label="Increase quantity"
              className="size-12 text-lg"
              disabled={quantity >= 100}
              type="button"
              onClick={() =>
                setQuantity((current) => Math.min(100, current + 1))
              }
            >
              +
            </Button>
          </span>
        </label>
        <Button
          className="h-12 flex-1 px-6 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canBuy || checkout.isPending}
          style={{
            backgroundColor: config.colors.primary,
            borderRadius: radiusValue(config.layout.borderRadius),
          }}
          type="button"
          onClick={() => checkout.mutate()}
        >
          {checkout.isPending ? "Reserving stock…" : "Buy now"}
        </Button>
      </div>

      {checkout.isError && (
        <div
          className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          style={{ borderRadius: radiusValue(config.layout.borderRadius) }}
        >
          <p className="font-semibold">We could not start checkout</p>
          <p className="mt-1">{getErrorMessage(checkout.error)}</p>
        </div>
      )}

      <div
        className="mt-8 border-t pt-6"
        style={{ borderColor: "currentColor" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-50">
          Share this product
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ShareLink
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            label="Facebook"
          />
          <ShareLink
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.name)}`}
            label="X"
          />
          <Button
            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
            type="button"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: product.name,
                  url: window.location.href,
                });
              } else {
                await navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            Share link
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShareLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      className="rounded-full border px-3 py-1.5 text-xs font-semibold"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}
