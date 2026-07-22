export const CATEGORY_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export type ProductCategory = {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  sortOrder: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type CategoryListFilters = {
  search: string;
  status: CategoryStatus | "ALL";
};

export type CategoryValues = {
  name: string;
  slug: string;
  description: string;
  logoFile?: File;
  logoPreviewUrl?: string;
  logoUrl: string;
  sortOrder: string;
  status: CategoryStatus;
};

export type CategoryPayload = {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string | null;
  sortOrder?: number;
  status: CategoryStatus;
};
