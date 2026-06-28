import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from '#app/app.controller';
import { AppService } from '#app/app.service';
import { CommonModule } from '#app/common/common.module';
import { AllExceptionsFilter } from '#app/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from '#app/common/interceptors/logging.interceptor';
import { ResponseInterceptor } from '#app/common/interceptors/response.interceptor';
import { AppConfigModule } from '#app/config/config.module';
import { DatabaseModule } from '#app/infrastructure/database/database.module';
import { EventsModule } from '#app/infrastructure/events/events.module';
import { LoggerModule } from '#app/infrastructure/logger/logger.module';
import { RedisModule } from '#app/infrastructure/redis/redis.module';
import { AuditLogModule } from '#app/modules/audit-log/audit-log.module';
import { AuthModule } from '#app/modules/authenticated/auth.module';
import { JwtAuthGuard } from '#app/modules/authenticated/guards/jwt-auth.guard';
import { AuthorizationModule } from '#app/modules/authorization/authorization.module';
import { MerchantScopeGuard } from '#app/modules/authorization/guards/merchant-scope.guard';
import { PermissionGuard } from '#app/modules/authorization/guards/permission.guard';
import { PlatformRolesGuard } from '#app/modules/authorization/guards/platform-roles.guard';
import { CatalogModule } from '#app/modules/catalog/catalog.module';
import { CheckoutModule } from '#app/modules/checkout/checkout.module';
import { InventoryModule } from '#app/modules/inventory/inventory.module';
import { MerchantUsersModule } from '#app/modules/merchant-users/merchant-users.module';
import { MerchantModule } from '#app/src/modules/merchant/merchant.module.js';
import { NotificationModule } from '#app/modules/notification/notification.module';
import { OrderModule } from '#app/modules/order/order.module';
import { PaymentModule } from '#app/modules/payment/payment.module';
import { PermissionsModule } from '#app/modules/permissions/permissions.module';
import { RolesModule } from '#app/modules/roles/roles.module';
import { SessionsModule } from '#app/modules/sessions/sessions.module';
import { SocialPostModule } from '#app/modules/social-post/social-post.module';
import { StorefrontModule } from '#app/modules/storefront/storefront.module';
import { ThemeModule } from '#app/modules/theme/theme.module';
import { UsersModule } from '#app/modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    RedisModule,
    LoggerModule,
    EventsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SessionsModule,
    MerchantModule,
    MerchantUsersModule,
    AuthorizationModule,
    CatalogModule,
    InventoryModule,
    StorefrontModule,
    ThemeModule,
    CheckoutModule,
    PaymentModule,
    OrderModule,
    SocialPostModule,
    NotificationModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PlatformRolesGuard },
    { provide: APP_GUARD, useClass: MerchantScopeGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
