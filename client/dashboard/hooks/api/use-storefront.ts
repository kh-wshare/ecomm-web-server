"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPublicProduct,
  getPublicProducts,
  getPublicStorefront,
} from "@/lib/storefront/storefront-data";
import { queryKeys } from "@/lib/query/keys";

export function useStorefront(merchantSlug: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.storefront.home(merchantSlug),
    queryFn: () => getPublicStorefront(merchantSlug),
    enabled: enabled && Boolean(merchantSlug),
  });
}

export function useStorefrontProducts(merchantSlug: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.storefront.home(merchantSlug), "products"],
    queryFn: () => getPublicProducts(merchantSlug),
    enabled: enabled && Boolean(merchantSlug),
  });
}

export function useStorefrontProduct(
  merchantSlug: string,
  productSlug: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.storefront.product(merchantSlug, productSlug),
    queryFn: () => getPublicProduct(merchantSlug, productSlug),
    enabled: enabled && Boolean(merchantSlug) && Boolean(productSlug),
  });
}
