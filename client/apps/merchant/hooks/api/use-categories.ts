"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@repo/query-client";

import {
  archiveCategory,
  createCategory,
  getCategories,
  normalizeCategoryPayload,
  updateCategory,
} from "@/lib/categories/category-data";
import type { CategoryListFilters, CategoryPayload } from "@/types/category";

export function useCategories(
  filters: CategoryListFilters,
  enabled = true,
) {
  return useQuery({
    enabled,
    queryFn: () => getCategories(filters),
    queryKey: queryKeys.categories.list(filters),
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      categoryId,
      values,
    }: {
      categoryId?: string;
      values: CategoryPayload;
    }) => {
      const payload = normalizeCategoryPayload(values);
      return categoryId
        ? updateCategory(categoryId, payload)
        : createCategory(payload);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveCategory,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}
