export type BranchStatus = "ACTIVE" | "INACTIVE";

export type MerchantBranch = {
  id: string;
  merchantId: string;
  name: string;
  code: string;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  registerName: string | null;
  isDefault: boolean;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
};

export type BranchValues = {
  name: string;
  code: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  registerName: string;
  isDefault: boolean;
  status: BranchStatus;
};
