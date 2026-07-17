import type {
  PublicArticle,
  PublicProduct,
  PublicProductPage,
  PublicStorefront,
} from "@/types/storefront";
import { apiClient } from "@/lib/api/client";

const publicRequest = {
  authenticated: false,
  cache: "no-store" as const,
  merchantId: null,
};

export async function getPublicStorefront(merchantSlug: string) {
  const response = await apiClient.get<PublicStorefront>(
    `/storefront/${merchantSlug}`,
    publicRequest,
  );

  return response.data;
}

export async function getPublicProducts(
  merchantSlug: string,
): Promise<PublicProductPage> {
  const response = await apiClient.get<PublicProduct[]>(
    `/storefront/${merchantSlug}/products?page=1&limit=100`,
    publicRequest,
  );

  return {
    items: response.data,
    meta: response.meta ?? {
      limit: 100,
      page: 1,
      total: response.data.length,
      totalPages: response.data.length ? 1 : 0,
      hasNext: false,
      hasPrev: false,
    },
  };
}

export async function getPublicProduct(
  merchantSlug: string,
  productSlug: string,
) {
  const response = await apiClient.get<PublicProduct>(
    `/storefront/${merchantSlug}/products/${productSlug}`,
    publicRequest,
  );

  return response.data;
}

export async function getPublicArticles(merchantSlug: string) {
  const response = await apiClient.get<PublicArticle[]>(
    `/storefront/${merchantSlug}/posts`,
    publicRequest,
  );

  return response.data;
}
