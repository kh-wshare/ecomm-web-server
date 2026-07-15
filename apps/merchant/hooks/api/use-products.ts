"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ProductFormChannel,
  ProductListFilters,
  ProductPayload,
} from "@/types/product";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
  updateProductChannelVisibility,
} from "@/lib/products/product-data";
import { queryKeys } from "@repo/query-client";

export function useProducts(
  filters: ProductListFilters,
  includeInventory = true,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.products.list({ ...filters, includeInventory }),
    queryFn: () => getProducts(filters, includeInventory),
    enabled,
  });
}

export function useProduct(productId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => getProduct(productId),
    enabled: enabled && Boolean(productId),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductPayload) => createProduct(payload),
    onSuccess: (product) => {
      queryClient.setQueryData(queryKeys.products.detail(product.id), product);
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      productId,
    }: {
      payload: ProductPayload;
      productId: string;
    }) => updateProduct(productId, payload),
    onSuccess: (product) => {
      queryClient.setQueryData(queryKeys.products.detail(product.id), product);
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

export function useUpdateProductChannelVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      channelVisibility,
      productId,
    }: {
      channelVisibility: ProductFormChannel[];
      productId: string;
    }) => updateProductChannelVisibility(productId, channelVisibility),
    onSuccess: (product) => {
      queryClient.setQueryData(queryKeys.products.detail(product.id), product);
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
