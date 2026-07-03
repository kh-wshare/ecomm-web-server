export type MerchantNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type UnreadNotificationCount = {
  count: number;
};
