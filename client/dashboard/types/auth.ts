export type DashboardUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  platformRole: string;
  mustChangePassword?: boolean;
};

export type MerchantSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type MerchantAccess = {
  merchant: MerchantSummary;
  role: string;
  permissions: string[];
};

export type CurrentProfile = {
  user: DashboardUser;
  merchants: MerchantAccess[];
};

export type SwitchMerchantResult = {
  accessToken: string;
  activeMerchant: MerchantAccess;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: DashboardUser;
  activeMerchant: MerchantAccess | null;
  merchants: MerchantAccess[];
};
