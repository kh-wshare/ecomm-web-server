export const PERMISSIONS = [
  'merchant.read',
  'merchant.update',
  'user.invite',
  'user.read',
  'user.update',
  'user.remove',
  'product.create',
  'product.read',
  'product.update',
  'product.delete',
  'inventory.read',
  'inventory.adjust',
  'theme.read',
  'theme.update',
  'theme.publish',
  'order.read',
  'order.update',
  'order.cancel',
  'order.refund',
  'payment.read',
  'payment.provider_manage',
  'social_post.create',
  'social_post.read',
  'social_post.update',
  'social_post.publish',
  'dashboard.read',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];
export type MerchantRoleCode =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'staff'
  | 'viewer';

export const ROLE_PERMISSIONS: Record<MerchantRoleCode, PermissionCode[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter((permission) => permission !== 'user.remove'),
  manager: [
    'merchant.read',
    'user.read',
    'product.create',
    'product.read',
    'product.update',
    'inventory.read',
    'inventory.adjust',
    'theme.read',
    'theme.update',
    'order.read',
    'order.update',
    'order.cancel',
    'social_post.create',
    'social_post.read',
    'social_post.update',
    'social_post.publish',
    'dashboard.read',
  ],
  staff: [
    'merchant.read',
    'product.read',
    'inventory.read',
    'theme.read',
    'order.read',
    'order.update',
    'social_post.read',
    'dashboard.read',
  ],
  viewer: [
    'merchant.read',
    'product.read',
    'inventory.read',
    'theme.read',
    'order.read',
    'social_post.read',
    'dashboard.read',
  ],
};
