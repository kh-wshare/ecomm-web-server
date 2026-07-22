import type { ApiResponse } from "@repo/types";

import type {
  CategoryListFilters,
  CategoryPayload,
  ProductCategory,
} from "@/types/category";

const commerceBasePath = "/merchant/api/commerce";

export async function getCategories(filters: CategoryListFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status !== "ALL") params.set("status", filters.status);

  return fetchAll<ProductCategory>(
    `/categories${params.size ? `?${params.toString()}` : ""}`,
  );
}

export async function createCategory(payload: CategoryPayload) {
  const response = await categoryRequest<ApiResponse<ProductCategory>>(
    "/categories",
    {
      body: payload,
      method: "POST",
    },
  );

  return response.data;
}

export async function updateCategory(
  categoryId: string,
  payload: CategoryPayload,
) {
  const response = await categoryRequest<ApiResponse<ProductCategory>>(
    `/categories/${categoryId}`,
    {
      body: payload,
      method: "PATCH",
    },
  );

  return response.data;
}

export async function archiveCategory(categoryId: string) {
  const response = await categoryRequest<ApiResponse<ProductCategory>>(
    `/categories/${categoryId}`,
    { method: "DELETE" },
  );

  return response.data;
}

export function normalizeCategoryPayload(
  values: CategoryPayload,
): CategoryPayload {
  return {
    name: values.name.trim(),
    slug: optional(values.slug),
    description: optional(values.description),
    logoUrl:
      values.logoUrl === undefined ? undefined : optionalNullable(values.logoUrl),
    sortOrder: values.sortOrder ?? 0,
    status: values.status,
  };
}

async function fetchAll<T>(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  const first = await categoryRequest<ApiResponse<T[]>>(
    `${path}${separator}page=1&limit=100`,
  );
  const items = [...first.data];
  const totalPages = first.meta?.totalPages ?? 1;

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        categoryRequest<ApiResponse<T[]>>(
          `${path}${separator}page=${index + 2}&limit=100`,
        ),
      ),
    );
    pages.forEach((page) => items.push(...page.data));
  }

  return items;
}

async function categoryRequest<T>(
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  const response = await fetch(`${commerceBasePath}${path}`, {
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    method: options.method ?? "GET",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Category request failed";

    throw new Error(message);
  }

  return payload as T;
}

function optional(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : undefined;
}

function optionalNullable(value: null | string) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}
