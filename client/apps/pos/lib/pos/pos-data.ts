import type { ApiResponse, Order, Product } from "@repo/types";
import { unwrapApiResponseData } from "@repo/api-client";

import { demoBranches, demoProducts } from "@/lib/pos/mock-data";
import type {
  CartItem,
  PaymentMethod,
  PosBranch,
  PosProduct,
  PosReceipt,
  PosSession,
} from "@/types/pos";

const POS_BASE_PATH = "/pos";

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

export async function loginPosStaff(payload: LoginPayload) {
  const response = await fetch(`${POS_BASE_PATH}/api/session/login`, {
    body: JSON.stringify(payload),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response, "Unable to sign in."));
  }

  return unwrapApiResponseData<PosSession>(await response.json());
}

export async function getPosSession() {
  const response = await fetch(`${POS_BASE_PATH}/api/session/me`, {
    credentials: "include",
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(await responseMessage(response, "Unable to restore session."));
  }

  return unwrapApiResponseData<PosSession>(await response.json());
}

export async function setActiveBranch(branch: PosBranch) {
  const response = await fetch(`${POS_BASE_PATH}/api/session/branch`, {
    body: JSON.stringify({ branch }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response, "Unable to switch branch."));
  }

  return unwrapApiResponseData<PosSession>(await response.json());
}

export async function getPosBranches(session: PosSession | null) {
  if (!session) return demoBranches;

  try {
    const response = await getPosApi<ApiResponse<BackendBranch[]>>(
      `${POS_BASE_PATH}/api/commerce/branches?status=ACTIVE`,
    );
    const branches = response.data.map(toPosBranch);

    return branches.length ? branches : demoBranches;
  } catch {
    return demoBranches;
  }
}

export async function logoutPosStaff() {
  await fetch(`${POS_BASE_PATH}/api/session/logout`, {
    credentials: "include",
    method: "POST",
  });
}

export async function getPosProducts(session: PosSession | null) {
  if (!session) return demoProducts;

  try {
    const response = await getPosApi<ApiResponse<Product[]>>(
      `${POS_BASE_PATH}/api/commerce/products?page=1&limit=100&status=ACTIVE`,
    );

    return response.data
      .filter((product) =>
        product.channelVisibility.some(
          (item) => item.channel === "POS" && item.isVisible,
        ),
      )
      .map(toPosProduct);
  } catch {
    return demoProducts;
  }
}

export async function getActivePosOrders(session: PosSession | null) {
  if (!session) return [];

  try {
    const response = await getPosApi<ApiResponse<Order[]>>(
      `${POS_BASE_PATH}/api/commerce/orders?page=1&limit=10&sourceChannel=POS`,
    );

    return response.data;
  } catch {
    return [];
  }
}

export async function createPosReceipt({
  branch,
  cashierName,
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
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const total = Math.max(0, subtotal - discount + serviceCharge + tax);

  return {
    id: crypto.randomUUID(),
    orderNumber: `POS-${Date.now().toString().slice(-6)}`,
    branchName: branch.name,
    cashierName,
    cashReceived,
    changeDue: paymentMethod === "CASH" ? Math.max(0, cashReceived - total) : 0,
    createdAt: new Date().toISOString(),
    customerName: customerName.trim() || "Walk-in customer",
    discount,
    items,
    paymentMethod,
    serviceCharge,
    subtotal,
    tax,
    total,
  } satisfies PosReceipt;
}

export function createDemoSession(identifier: string): PosSession {
  return {
    activeBranch: demoBranches[0],
    merchant: {
      id: "demo-merchant",
      name: "Demo Merchant",
      slug: "demo-merchant",
    },
    user: {
      id: "demo-staff",
      fullName: "POS Staff",
      email: identifier.includes("@") ? identifier : "staff@example.com",
      phone: identifier.includes("@") ? undefined : identifier,
      branchIds: demoBranches.map((branch) => branch.id),
      roles: ["cashier"],
      permissions: ["pos.access", "pos.sale.create"],
    },
  };
}

function toPosProduct(product: Product): PosProduct {
  return {
    ...product,
    category: inferCategory(product.name),
    imageUrl: product.media.find((item) => item.type === "IMAGE")?.url,
    stocks: [
      {
        availableStock: product.inventory?.totalStock ?? 0,
        productId: product.id,
        variantId: null,
      },
    ],
  };
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
        .join(", ") || "No address",
    name: branch.name,
    register: branch.registerName ?? branch.code,
  };
}

function inferCategory(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("coffee") || lower.includes("espresso")) return "Coffee";
  if (lower.includes("tea") || lower.includes("matcha")) return "Tea";
  if (lower.includes("sandwich") || lower.includes("food")) return "Food";
  if (lower.includes("tote") || lower.includes("bean")) return "Merch";

  return "Featured";
}

async function responseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return typeof payload?.message === "string" ? payload.message : fallback;
}

async function getPosApi<TResponse>(path: string) {
  const response = await fetch(path, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await responseMessage(response, "Unable to load POS data."));
  }

  return (await response.json()) as TResponse;
}
