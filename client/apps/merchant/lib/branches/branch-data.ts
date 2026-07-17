import type { ApiResponse } from "@repo/types";

import type { BranchValues, MerchantBranch } from "@/types/branch";

const commerceBasePath = "/merchant/api/commerce";

export async function getBranches(filters: { status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  const suffix = params.size ? `?${params.toString()}` : "";
  const response = await branchRequest<ApiResponse<MerchantBranch[]>>(
    `/branches${suffix}`,
  );

  return response.data;
}

export async function createBranch(values: BranchValues) {
  const response = await branchRequest<ApiResponse<MerchantBranch>>(
    "/branches",
    {
      body: normalize(values),
      method: "POST",
    },
  );

  return response.data;
}

export async function updateBranch(branchId: string, values: BranchValues) {
  const response = await branchRequest<ApiResponse<MerchantBranch>>(
    `/branches/${branchId}`,
    {
      body: normalize(values),
      method: "PATCH",
    },
  );

  return response.data;
}

export async function archiveBranch(branchId: string) {
  const response = await branchRequest<ApiResponse<MerchantBranch>>(
    `/branches/${branchId}`,
    { method: "DELETE" },
  );

  return response.data;
}

function normalize(values: BranchValues) {
  return {
    ...values,
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    phone: optional(values.phone),
    addressLine1: optional(values.addressLine1),
    addressLine2: optional(values.addressLine2),
    city: optional(values.city),
    province: optional(values.province),
    postalCode: optional(values.postalCode),
    country: optional(values.country),
    registerName: optional(values.registerName),
  };
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

async function branchRequest<T>(
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
        : "Branch request failed";

    throw new Error(message);
  }

  return payload as T;
}
