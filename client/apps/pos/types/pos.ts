import type {
  AuthUser,
  Order,
  PaymentProviderCode,
  Product,
} from '@repo/types';

export type PosBranch = {
  id: string;
  code?: string;
  name: string;
  register: string;
  location: string;
};

export type PosSession = {
  activeBranch: PosBranch | null;
  merchant: {
    id: string;
    name: string;
    slug: string;
  };
  user: AuthUser;
};

export type PosProduct = Omit<Product, 'category'> & {
  category: string;
  categorySlug: string;
  imageUrl?: string;
  stocks: Array<{
    productId: string;
    variantId: string | null;
    availableStock: number;
  }>;
};

export type PosCategory = {
  id: string;
  logoUrl?: string | null;
  name: string;
  slug: string;
  sortOrder: number;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  category: string;
  name: string;
  sku: string;
  quantity: number;
  availableStock: number;
  unitPrice: number;
  note: string;
};

export type PaymentMethod = 'CASH' | Extract<PaymentProviderCode, 'KHQR'>;

export type PosReceipt = {
  id: string;
  orderNumber: string;
  branchName: string;
  cashierName: string;
  createdAt: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  serviceCharge: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  changeDue: number;
};

export type PosOrder = Order | PosReceipt;
