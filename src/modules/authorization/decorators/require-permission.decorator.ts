import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '../authorization.constants';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: PermissionCode) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);
