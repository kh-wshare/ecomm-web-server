import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { MerchantScopeGuard } from './guards/merchant-scope.guard';
import { PermissionGuard } from './guards/permission.guard';
import { PlatformRolesGuard } from './guards/platform-roles.guard';

@Module({
  providers: [
    AuthorizationService,
    MerchantScopeGuard,
    PermissionGuard,
    PlatformRolesGuard,
  ],
  exports: [
    AuthorizationService,
    MerchantScopeGuard,
    PermissionGuard,
    PlatformRolesGuard,
  ],
})
export class AuthorizationModule {}
