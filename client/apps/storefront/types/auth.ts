export type CustomerUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  user: CustomerUser;
  activeMerchant: null;
  merchants: [];
};

export type CustomerSession = {
  user: CustomerUser;
};
