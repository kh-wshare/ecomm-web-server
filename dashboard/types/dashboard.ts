export type DashboardOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string;
  sourceChannel: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalAmount: string;
  currency: string;
  paidAt: string | null;
  createdAt: string;
};

export type DashboardInventoryStock = {
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
  product: {
    name: string;
    sku: string;
    status: string;
  };
  variant: {
    name: string;
    sku: string;
    status: string;
  } | null;
};

export type SalesPoint = {
  date: string;
  label: string;
  revenue: number;
};

export type DashboardHomeData = {
  currency: string;
  inventoryCount: number;
  lowStock: DashboardInventoryStock[];
  paidOrders: DashboardOrder[];
  pendingOrders: number;
  recentOrders: DashboardOrder[];
  sales: SalesPoint[];
  totalOrders: number;
  totalRevenue: number;
};
