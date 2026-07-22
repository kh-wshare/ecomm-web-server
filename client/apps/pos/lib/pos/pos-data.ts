import type {
  ApiResponse,
  InventoryStock,
  Order,
  Product,
  ProductCategory,
} from '@repo/types';
import { unwrapApiResponseData } from '@repo/api-client';

import type {
  CartItem,
  PaymentMethod,
  PosBranch,
  PosCategory,
  PosProduct,
  PosReceipt,
  PosSession,
} from '@/types/pos';

const POS_BASE_PATH = '/pos';

type LoginPayload = {
  email: string;
  password: string;
};

type BackendBranch = {
  id: string;
  code: string;
  name: string;
  registerName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  isDefault: boolean;
};

type BackendPosSaleResponse = {
  receipt: PosReceipt;
};

export async function loginPosStaff(payload: LoginPayload) {
  const response = await fetch(`${POS_BASE_PATH}/api/session/login`, {
    body: JSON.stringify(payload),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response, 'Unable to sign in.'));
  }

  return unwrapApiResponseData<PosSession>(await response.json());
}

export async function getPosSession() {
  const response = await fetch(`${POS_BASE_PATH}/api/session/me`, {
    credentials: 'include',
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(
      await responseMessage(response, 'Unable to restore session.'),
    );
  }

  return unwrapApiResponseData<PosSession>(await response.json());
}

export async function setActiveBranch(branch: PosBranch) {
  const response = await fetch(`${POS_BASE_PATH}/api/session/branch`, {
    body: JSON.stringify({ branch }),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(
      await responseMessage(response, 'Unable to switch branch.'),
    );
  }

  return unwrapApiResponseData<PosSession>(await response.json());
}

export async function getPosBranches(session: PosSession | null) {
  if (!session) return [];

  const response = await getPosApi<ApiResponse<BackendBranch[]>>(
    `${POS_BASE_PATH}/api/commerce/branches?status=ACTIVE`,
  );

  return response.data.map(toPosBranch);
}

export async function getPosCategories(
  session: PosSession | null,
) {
  if (!session) return [];

  const params = new URLSearchParams({
    limit: '100',
    page: '1',
    status: 'ACTIVE',
  });
  const response = await getPosApi<ApiResponse<ProductCategory[]>>(
    `${POS_BASE_PATH}/api/commerce/categories?${params.toString()}`,
  );

  return response.data.map(toPosCategory);
}

export async function logoutPosStaff() {
  await fetch(`${POS_BASE_PATH}/api/session/logout`, {
    credentials: 'include',
    method: 'POST',
  });
}

export async function getPosProducts(
  session: PosSession | null,
  branch: PosBranch | null,
) {
  if (!session) return [];
  if (!branch) return [];

  const params = new URLSearchParams({
    limit: '100',
    page: '1',
    status: 'ACTIVE',
  });
  const response = await getPosApi<ApiResponse<Product[]>>(
    `${POS_BASE_PATH}/api/commerce/products?${params.toString()}`,
  );
  const products = await Promise.all(
    response.data.map((product) => getPosProduct(product.id)),
  );

  return products
    .filter(isPosVisible)
    .map(toPosProduct);
}

export async function getActivePosOrders(session: PosSession | null) {
  if (!session) return [];

  const response = await getPosApi<ApiResponse<Order[]>>(
    `${POS_BASE_PATH}/api/commerce/orders?page=1&limit=10&sourceChannel=POS`,
  );

  return response.data;
}

export async function createPosReceipt({
  branch,
  cashReceived,
  customerName,
  discount,
  items,
  paymentMethod,
  serviceCharge,
  tax,
}: {
  branch: PosBranch;
  cashierName: string;
  cashReceived: number;
  customerName: string;
  discount: number;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  serviceCharge: number;
  tax: number;
}) {
  const response = await postPosApi<ApiResponse<BackendPosSaleResponse>>(
    `${POS_BASE_PATH}/api/commerce/pos/sales`,
    {
      branchId: branch.id,
      cashReceived,
      customerName,
      discountAmount: discount,
      items: items.map((item) => ({
        category: item.category,
        note: item.note,
        productId: item.productId,
        quantity: item.quantity,
        variantId: item.variantId,
      })),
      paymentMethod,
      serviceChargeAmount: serviceCharge,
      taxAmount: tax,
    },
  );

  return response.data.receipt;
}

function toPosProduct(product: Product): PosProduct {
  const categoryName = product.category?.name ?? 'Uncategorized';
  const media = product.media ?? [];

  return {
    ...product,
    category: categoryName,
    categorySlug: product.category?.slug ?? toSlug(categoryName),
    channelVisibility: product.channelVisibility ?? [],
    imageUrl: media.find((item) => item.type === 'IMAGE')?.url,
    media,
    variants: product.variants ?? [],
    stocks: [
      {
        availableStock: availableFromInventory(product.inventory),
        productId: product.id,
        variantId: null,
      },
      ...(product.variants ?? []).map((variant) => ({
        availableStock: availableFromInventory(variant.inventory),
        productId: product.id,
        variantId: variant.id,
      })),
    ],
  };
}

async function getPosProduct(productId: string) {
  const response = await getPosApi<ApiResponse<Product>>(
    `${POS_BASE_PATH}/api/commerce/products/${productId}`,
  );

  return response.data;
}

function isPosVisible(product: Product) {
  return (product.channelVisibility ?? []).some(
    (item) => item.channel === 'POS' && item.isVisible,
  );
}

function toPosCategory(category: ProductCategory): PosCategory {
  return {
    id: category.id,
    logoUrl: category.logoUrl ?? null,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
  };
}

function availableFromInventory(inventory?: InventoryStock) {
  if (!inventory) return 0;

  return Math.max(
    0,
    inventory.totalStock -
      inventory.reservedStock -
      inventory.soldStock -
      inventory.safetyBuffer,
  );
}

function toPosBranch(branch: BackendBranch): PosBranch {
  return {
    code: branch.code,
    id: branch.id,
    location:
      [
        branch.addressLine1,
        branch.addressLine2,
        branch.city,
        branch.province,
        branch.country,
      ]
        .filter(Boolean)
        .join(', ') || 'No address',
    name: branch.name,
    register: branch.registerName ?? branch.code,
  };
}

function toSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'featured'
  );
}

async function responseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return typeof payload?.message === 'string' ? payload.message : fallback;
}

async function getPosApi<TResponse>(path: string) {
  const response = await fetch(path, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(
      await responseMessage(response, 'Unable to load POS data.'),
    );
  }

  return (await response.json()) as TResponse;
}

async function postPosApi<TResponse>(path: string, body: unknown) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(
      await responseMessage(response, 'Unable to save POS sale.'),
    );
  }

  return (await response.json()) as TResponse;
}
