import type {
  ProductStatus as SharedProductStatus,
  SalesChannel as SharedSalesChannel,
} from "@repo/types";
import type { ProductCategory } from "@/types/category";

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;
export const VARIANT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export const SALES_CHANNELS = [
  "POS",
  "WEBSITE",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
] as const;

export type ProductStatus = SharedProductStatus;
export type VariantStatus = (typeof VARIANT_STATUSES)[number];
export type SalesChannel = SharedSalesChannel;

export type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  price: string;
  attributes: Record<string, unknown>;
  status: VariantStatus;
};

export type ProductMedia = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  sortOrder: number;
};

export type ProductChannelVisibility = {
  id: string;
  channel: SalesChannel;
  isVisible: boolean;
  isPurchasable: boolean;
};

export type Product = {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: string;
  currency: string;
  status: ProductStatus;
  categoryId: string | null;
  category?: ProductCategory | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  variants?: ProductVariant[];
  media?: ProductMedia[];
  channelVisibility?: ProductChannelVisibility[];
};

export type InventoryStock = {
  id: string;
  productId: string;
  variantId: string | null;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  safetyBuffer: number;
  availableStock: number;
  onlineSellableStock: number;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  type: string;
  quantity: number;
  referenceId: string | null;
  referenceType: string | null;
  createdAt: string;
};

export type ProductInventoryDetail = {
  productId: string;
  stocks: InventoryStock[];
  activeReservations: Array<{
    id: string;
    inventoryStockId: string;
    quantity: number;
    status: string;
    expiresAt: string;
  }>;
  recentMovements: InventoryMovement[];
};

export type ProductOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  currency: string;
  totalAmount: string;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
};

export type ProductListItem = Product & {
  stocks: InventoryStock[];
};

export type ProductListFilters = {
  channel: SalesChannel | "ALL";
  search: string;
  status: ProductStatus | "ALL";
};

export type ProductFormVariant = {
  key: string;
  sku: string;
  name: string;
  price: string;
  attributes: string;
  status: VariantStatus;
  initialStock: string;
  safetyBuffer: string;
  stockAdjustment: string;
};

export type ProductFormMedia = {
  key: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  file?: File;
  previewUrl?: string;
  fileName?: string;
  fileSize?: number;
};

export type ProductFormChannel = {
  channel: SalesChannel;
  isVisible: boolean;
  isPurchasable: boolean;
};

export type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: string;
  currency: string;
  status: ProductStatus;
  categoryId: string;
  variants: ProductFormVariant[];
  media: ProductFormMedia[];
  channels: ProductFormChannel[];
  initialStock: string;
  safetyBuffer: string;
  stockAdjustment: string;
};

export type ProductPayload = {
  name: string;
  slug?: string;
  description?: string;
  sku: string;
  price: string;
  currency: string;
  status: ProductStatus;
  categoryId?: string | null;
  variants: Array<{
    sku: string;
    name: string;
    price: string;
    attributes: Record<string, unknown>;
    status: VariantStatus;
  }>;
  media: Array<{
    url: string;
    type: "IMAGE" | "VIDEO";
    sortOrder: number;
  }>;
  channelVisibility: Array<{
    channel: SalesChannel;
    isVisible: boolean;
    isPurchasable: boolean;
  }>;
  inventory?: Array<{
    variantSku?: string;
    initialStock: number;
    safetyBuffer: number;
  }>;
};
