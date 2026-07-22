export type ID = string;

export type PaginationMeta = {
  limit?: number;
  page: number;
  pageSize?: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};

export type ApiResponse<T> = {
  data: T;
  message: string;
  meta?: PaginationMeta;
  path: string;
  statusCode: number;
  timestamp: string;
  correlationId?: string;
};

export type ApiErrorBody = {
  statusCode: number;
  code?: string;
  message: string;
  fields?: Record<string, string[]>;
};

export type PermissionCode =
  | 'merchant.dashboard.read'
  | 'products.read'
  | 'products.create'
  | 'products.update'
  | 'products.delete'
  | 'inventory.read'
  | 'inventory.update'
  | 'orders.read'
  | 'orders.update'
  | 'payments.manage'
  | 'storefront.manage'
  | 'social.manage'
  | 'pos.access'
  | 'pos.sale.create';

export type AuthUser = {
  id: ID;
  fullName: string;
  email?: string;
  phone?: string;
  merchantId?: string;
  branchIds: ID[];
  roles: string[];
  permissions: PermissionCode[];
};

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type SalesChannel =
  | 'WEBSITE'
  | 'POS'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TIKTOK';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type PaymentMethodCode = 'CASH' | 'KHQR' | 'COD' | 'HMAC';

export type InventoryStock = {
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  safetyBuffer: number;
};

export type ProductVariant = {
  id: ID;
  productId: ID;
  sku: string;
  name: string;
  price?: string;
  attributes: Record<string, string>;
  status: ProductStatus;
  inventory?: InventoryStock;
};

export type ProductMedia = {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  sortOrder: number;
};

export type ProductChannelVisibility = {
  channel: SalesChannel;
  isVisible: boolean;
  isPurchasable: boolean;
};

export type ProductCategoryStatus = 'ACTIVE' | 'INACTIVE';

export type ProductCategory = {
  id: ID;
  merchantId: ID;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  sortOrder: number;
  status: ProductCategoryStatus;
};

export type Product = {
  id: ID;
  merchantId: ID;
  categoryId?: ID | null;
  category?: ProductCategory | null;
  name: string;
  slug: string;
  description?: string;
  sku: string;
  price: string;
  currency: string;
  status: ProductStatus;
  variants: ProductVariant[];
  media: ProductMedia[];
  channelVisibility: ProductChannelVisibility[];
  inventory?: InventoryStock;
};

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'RESERVED'
  | 'PAID'
  | 'PROCESSING'
  | 'FULFILLED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type FulfillmentStatus =
  | 'UNFULFILLED'
  | 'PROCESSING'
  | 'FULFILLED'
  | 'CANCELLED';

export type OrderItem = {
  id: ID;
  productId: ID;
  variantId: ID | null;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type OrderPaymentSummary = {
  id: ID;
  provider: string;
  providerTransactionId: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
} | null;

export type OrderTimelineEvent = {
  id: ID;
  action: string;
  after: Record<string, unknown> | null;
  createdAt: string;
  user: { fullName: string } | null;
};

export type Order = {
  id: ID;
  orderNumber: string;
  customerId: ID | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  sourceChannel: SalesChannel;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotalAmount: string;
  discountAmount: string;
  feeAmount: string;
  totalAmount: string;
  currency: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment?: OrderPaymentSummary;
  timeline?: OrderTimelineEvent[];
};

export type OrderFilters = {
  search: string;
  paymentStatus: PaymentStatus | 'ALL';
  fulfillmentStatus: FulfillmentStatus | 'ALL';
  sourceChannel: SalesChannel | 'ALL';
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
};

export type OrderPage = {
  items: Order[];
  meta: PaginationMeta;
};

export type PaymentProviderCode = 'HMAC' | 'KHQR' | 'ABA_PAYWAY';
export type PaymentProviderStatus = 'ACTIVE' | 'INACTIVE';

export type PaymentTransactionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentProvider = {
  id: ID;
  provider: PaymentProviderCode;
  status: PaymentProviderStatus;
  config: Record<string, unknown>;
  hasWebhookSecret: boolean;
  hasProviderSecret: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaymentWebhookEvent = {
  id: ID;
  eventId: string;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
  error: string | null;
  processedAt: string | null;
  createdAt: string;
};

export type Payment = {
  id: ID;
  orderId: ID;
  provider: PaymentProviderCode;
  providerTransactionId: string;
  amount: string;
  currency: string;
  status: PaymentTransactionStatus;
  paidAt: string | null;
  createdAt: string;
  order: {
    id: ID;
    orderNumber: string;
    status?: string;
    paymentStatus?: string;
  };
  webhookEvents?: PaymentWebhookEvent[];
};

export type PaymentFilters = {
  search: string;
  provider: PaymentProviderCode | 'ALL';
  status: PaymentTransactionStatus | 'ALL';
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
};

export type PaymentPage = {
  items: Payment[];
  meta: PaginationMeta;
};

export type CheckoutSessionStatus =
  | 'ACTIVE'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'EXPIRED';

export type CheckoutItem = {
  id: ID;
  productId: ID;
  variantId: ID | null;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type CheckoutOrder = {
  id: ID;
  orderNumber: string;
  status: string;
};

export type CheckoutSession = {
  id: ID;
  customerId: ID | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  sourceChannel: 'WEBSITE';
  status: CheckoutSessionStatus;
  subtotalAmount: string;
  discountAmount: string;
  feeAmount: string;
  totalAmount: string;
  currency: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  items: CheckoutItem[];
  order: CheckoutOrder | null;
  paymentProviders: Array<{ provider: PaymentProviderCode }>;
};

export type CreatedCheckoutSession = CheckoutSession & {
  checkoutToken: string;
};

export type CreateCheckoutPayload = {
  merchantSlug: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  sourceChannel: 'WEBSITE';
  items: Array<{
    productId: ID;
    variantId?: ID;
    quantity: number;
  }>;
};

export type CheckoutContext = {
  token: string;
  merchantSlug: string;
  productSlug: string;
  payment?: Pick<
    Payment,
    | 'id'
    | 'orderId'
    | 'provider'
    | 'providerTransactionId'
    | 'amount'
    | 'currency'
    | 'status'
    | 'createdAt'
  >;
};

export type PublicMerchant = {
  id: ID;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
};

export type PublicProductMedia = {
  url: string;
  type: 'IMAGE' | 'VIDEO';
  sortOrder: number;
};

export type PublicProductVariant = {
  id: ID;
  name: string;
  sku: string;
  price: string;
  attributes: Record<string, unknown>;
  isAvailable: boolean;
};

export type PublicProduct = {
  id: ID;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: string;
  currency: string;
  channel: 'WEBSITE';
  baseIsAvailable: boolean;
  isAvailable: boolean;
  isPurchasable: boolean;
  media: PublicProductMedia[];
  variants: PublicProductVariant[];
};

export type PublicTheme = {
  version: number;
  config: Record<string, unknown>;
  publishedAt: string | null;
};

export type PublicStorefront = {
  merchant: PublicMerchant;
  theme: PublicTheme;
  featuredProducts: PublicProduct[];
};

export type PublicProductPage = {
  items: PublicProduct[];
  meta: PaginationMeta;
};

export type PublicArticle = {
  id: ID;
  slug: string;
  title: string;
  content: string;
  mediaUrls: string[];
  publishedAt: string;
  hotspots: Array<{
    id: ID;
    xPercent: string;
    yPercent: string;
    label: string | null;
    socialLink: string;
  }>;
};
