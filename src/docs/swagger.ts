import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

function envFlag(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  return value === undefined ? fallback : value.toLowerCase() === 'true';
}

export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
): string[] {
  const isProduction =
    configService.get<string>('app.nodeEnv') === 'production';
  if (!envFlag('SWAGGER_ENABLED', !isProduction)) return [];

  const documents: string[] = [];

  if (envFlag('SWAGGER_USER_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('User API')
      .setDescription('Authentication, sessions, profiles, and merchant access')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      include: [AuthModule],
    });
    SwaggerModule.setup('docs/user', app, document, {
      jsonDocumentUrl: 'docs/user/openapi.json',
    });
    documents.push('/docs/user');
  }

  if (envFlag('SWAGGER_MERCHANT_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('Merchant API')
      .setDescription('Tenant-scoped merchant dashboard operations')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'X-Merchant-ID', in: 'header' },
        'merchant-context',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      include: [
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
    });
    SwaggerModule.setup('docs/merchant', app, document, {
      jsonDocumentUrl: 'docs/merchant/openapi.json',
    });
    documents.push('/docs/merchant');
  }

  if (envFlag('SWAGGER_POS_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('POS API')
      .setDescription(
        'Authenticated point-of-sale operations for branch selection, POS catalog browsing, inventory visibility, POS sale completion, and POS order lookup',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        { type: 'apiKey', name: 'X-Merchant-ID', in: 'header' },
        'merchant-context',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      include: [
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
    });
    SwaggerModule.setup('docs/pos', app, document, {
      jsonDocumentUrl: 'docs/pos/openapi.json',
    });
    documents.push('/docs/pos');
  }

  if (envFlag('SWAGGER_STOREFRONT_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('Storefront API')
      .setDescription(
        'Public storefront browsing, carts, shopper addresses, delivery options and tracking, checkout sessions, payment initiation, and payment status polling',
      )
      .setVersion('1.0')
      .addApiKey(
        { type: 'apiKey', name: 'X-Checkout-Token', in: 'header' },
        'checkout-token',
      )
      .addApiKey(
        { type: 'apiKey', name: 'X-Cart-Token', in: 'header' },
        'cart-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      include: [
        StorefrontModule,
        CartModule,
        StorefrontAddressModule,
        StorefrontDeliveryModule,
        CheckoutModule,
        StorefrontSocialPostModule,
        StorefrontPaymentModule,
        StorefrontPaymentWebhookModule,
      ],
    });
    SwaggerModule.setup('docs/storefront', app, document, {
      jsonDocumentUrl: 'docs/storefront/openapi.json',
    });
    documents.push('/docs/storefront');
  }

  if (envFlag('SWAGGER_ADMIN_ENABLED', !isProduction)) {
    const config = new DocumentBuilder()
      .setTitle('Admin API')
      .setDescription(
        'Internal platform administration; separate from merchant admin roles',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      include: [UsersModule],
    });
    SwaggerModule.setup('docs/admin', app, document, {
      jsonDocumentUrl: 'docs/admin/openapi.json',
    });
    documents.push('/docs/admin');
  }

  return documents;
}
