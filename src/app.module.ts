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
import { AuditLogModule } from '@modules/audit-log/audit-log.module';
import { AuthModule } from '@modules/authenticated/auth.module';
import { JwtAuthGuard } from '@modules/authenticated/guards/jwt-auth.guard';
import { AuthorizationModule } from '@modules/authorization/authorization.module';
import { MerchantScopeGuard } from '@modules/authorization/guards/merchant-scope.guard';
import { PermissionGuard } from '@modules/authorization/guards/permission.guard';
import { PlatformRolesGuard } from '@modules/authorization/guards/platform-roles.guard';
import { BranchModule } from '@modules/branch/branch.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { CheckoutModule } from '@modules/checkout/checkout.module';
import { FileStorageModule } from '@modules/file-storage/file-storage.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { MerchantModule } from '@modules/merchant/merchant.module';
import { MetricsModule } from '@modules/metrics/metrics.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { OrderModule } from '@modules/order/order.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { PosModule } from '@modules/pos/pos.module';
import { RolesModule } from '@modules/roles/roles.module';
import { SessionsModule } from '@modules/sessions/sessions.module';
import { SocialPostModule } from '@modules/social-post/social-post.module';
import { StorefrontModule } from '@modules/storefront/storefront.module';
import { ThemeModule } from '@modules/theme/theme.module';
import { UsersModule } from '@modules/users/users.module';
import { StorefrontPaymentModule } from '@/modules/storefront/payment/payment.module';
import { StorefrontPaymentWebhookModule } from '@/modules/storefront/payment-webhook/payment-webhook.module';
import { StorefrontSocialPostModule } from '@/modules/storefront/social-post/public-social.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    RedisModule,
    LoggerModule,
    EventsModule,
    MetricsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SessionsModule,
    MerchantModule,
    AuthorizationModule,
    BranchModule,
    CatalogModule,
    FileStorageModule,
    InventoryModule,
    ThemeModule,
    CheckoutModule,
    PaymentModule,
    PosModule,
    OrderModule,
    SocialPostModule,
    NotificationModule,
    StorefrontModule,
    StorefrontPaymentModule,
    StorefrontPaymentWebhookModule,
    StorefrontSocialPostModule,
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
