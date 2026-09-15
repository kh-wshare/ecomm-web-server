import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { AuthModule } from '@modules/authenticated/auth.module';
import { BranchModule } from '@modules/branch/branch.module';
import { CategoriesModule } from '@modules/catalog/categories/categories.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { CheckoutModule } from '@modules/checkout/checkout.module';
import { FileStorageModule } from '@modules/merchant/file-storage/file-storage.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { LogisticsModule } from '@modules/logistics/logistics.module';
import { MerchantModule } from '@modules/merchant/merchant.module';
import { NotificationModule } from '@modules/merchant/notification/notification.module';
import { OrderModule } from '@modules/order/order.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { PosDevicesModule } from '@modules/pos/devices/devices.module';
import { PosAuditModule } from '@modules/pos/audit/audit.module';
import { PosCustomersModule } from '@modules/pos/customers/customers.module';
import { KitchenModule } from '@modules/pos/kitchen/kitchen.module';
import { PosOrdersModule } from '@modules/pos/orders/pos-orders.module';
import { PosPaymentsModule } from '@modules/pos/payments/pos-payments.module';
import { PosModule } from '@modules/pos/pos.module';
import { PosShiftsModule } from '@modules/pos/shifts/shifts.module';
import { PosSyncModule } from '@modules/pos/sync/sync.module';
import { PosTablesModule } from '@modules/pos/tables/tables.module';
import { SocialPostModule } from '@modules/merchant/social-post/social-post.module';
import { StorefrontModule } from '@modules/storefront/storefront.module';
import { ThemeModule } from '@modules/merchant/theme/theme.module';
import { UsersModule } from '@modules/users/users.module';
import { StorefrontPaymentModule } from '@modules/storefront/payment/payment.module';
import { StorefrontPaymentWebhookModule } from '@modules/storefront/payment-webhook/payment-webhook.module';
import { StorefrontSocialPostModule } from '@modules/storefront/social-post/public-social.module';
import { CartModule } from '@modules/storefront/cart/cart.module';
import { StorefrontAddressModule } from '@modules/storefront/address/address.module';
import { StorefrontDeliveryModule } from '@modules/storefront/delivery/storefront-delivery.module';

/** Authentication a surface expects; drives both Swagger and the Postman export. */
export type ApiSurfaceAuth = 'bearer' | 'bearer+merchant' | 'storefront-tokens';

export interface ApiSurface {
  /** Stable id used for file names (`merchant` -> `merchant.openapi.json`). */
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Route Swagger UI is mounted on, without a leading slash. */
  readonly docsPath: string;
  /** Env flag that toggles the surface, and its default. */
  readonly envFlag: string;
  readonly enabledByDefaultInProduction: boolean;
  readonly auth: ApiSurfaceAuth;
  /** Nest module classes whose controllers make up this surface. */
  readonly modules: readonly (new (...args: never[]) => unknown)[];
}

/**
 * Every public API surface, kept in one place so Swagger UI, the exported
 * OpenAPI documents and the generated Postman collections never drift apart.
 */
export const API_SURFACES: readonly ApiSurface[] = [
  {
    id: 'user',
    title: 'User API',
    description: 'Authentication, sessions, profiles, and merchant access',
    docsPath: 'docs/user',
    envFlag: 'SWAGGER_USER_ENABLED',
    enabledByDefaultInProduction: true,
    auth: 'bearer',
    modules: [AuthModule],
  },
  {
    id: 'merchant',
    title: 'Merchant API',
    description: 'Tenant-scoped merchant dashboard operations',
    docsPath: 'docs/merchant',
    envFlag: 'SWAGGER_MERCHANT_ENABLED',
    enabledByDefaultInProduction: true,
    auth: 'bearer+merchant',
    modules: [
      MerchantModule,
      BranchModule,
      CategoriesModule,
      CatalogModule,
      FileStorageModule,
      InventoryModule,
      ThemeModule,
      OrderModule,
      PaymentModule,
      LogisticsModule,
      SocialPostModule,
      NotificationModule,
    ],
  },
  {
    id: 'pos',
    title: 'POS API',
    description:
      'Authenticated point-of-sale operations for branch selection, POS catalog browsing, inventory visibility, POS sale completion, and POS order lookup',
    docsPath: 'docs/pos',
    envFlag: 'SWAGGER_POS_ENABLED',
    enabledByDefaultInProduction: true,
    auth: 'bearer+merchant',
    modules: [
      BranchModule,
      CategoriesModule,
      CatalogModule,
      InventoryModule,
      OrderModule,
      PosModule,
      PosDevicesModule,
      PosShiftsModule,
      PosOrdersModule,
      KitchenModule,
      PosPaymentsModule,
      PaymentModule,
      PosTablesModule,
      PosCustomersModule,
      PosSyncModule,
      PosAuditModule,
    ],
  },
  {
    id: 'storefront',
    title: 'Storefront API',
    description:
      'Public storefront browsing, carts, shopper addresses, delivery options and tracking, checkout sessions, payment initiation, and payment status polling',
    docsPath: 'docs/storefront',
    envFlag: 'SWAGGER_STOREFRONT_ENABLED',
    enabledByDefaultInProduction: true,
    auth: 'storefront-tokens',
    modules: [
      StorefrontModule,
      CartModule,
      StorefrontAddressModule,
      StorefrontDeliveryModule,
      CheckoutModule,
      StorefrontSocialPostModule,
      StorefrontPaymentModule,
      StorefrontPaymentWebhookModule,
    ],
  },
  {
    id: 'admin',
    title: 'Admin API',
    description:
      'Internal platform administration; separate from merchant admin roles',
    docsPath: 'docs/admin',
    envFlag: 'SWAGGER_ADMIN_ENABLED',
    enabledByDefaultInProduction: false,
    auth: 'bearer',
    modules: [UsersModule],
  },
];

export function buildOpenApiDocument(
  app: INestApplication,
  surface: ApiSurface,
): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle(surface.title)
    .setDescription(surface.description)
    .setVersion('1.0');

  if (surface.auth === 'bearer' || surface.auth === 'bearer+merchant') {
    builder.addBearerAuth();
  }
  if (surface.auth === 'bearer+merchant') {
    builder.addApiKey(
      { type: 'apiKey', name: 'X-Merchant-ID', in: 'header' },
      'merchant-context',
    );
  }
  if (surface.auth === 'storefront-tokens') {
    builder.addApiKey(
      { type: 'apiKey', name: 'X-Checkout-Token', in: 'header' },
      'checkout-token',
    );
    builder.addApiKey(
      { type: 'apiKey', name: 'X-Cart-Token', in: 'header' },
      'cart-token',
    );
  }

  return SwaggerModule.createDocument(app, builder.build(), {
    include: [...surface.modules],
  });
}
