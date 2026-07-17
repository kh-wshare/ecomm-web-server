import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from '#app/modules/authenticated/auth.module';
import { BranchModule } from '#app/modules/branch/branch.module';
import { CatalogModule } from '#app/modules/catalog/catalog.module';
import { CheckoutModule } from '#app/modules/checkout/checkout.module';
import { FileStorageModule } from '#app/modules/file-storage/file-storage.module';
import { InventoryModule } from '#app/modules/inventory/inventory.module';
import { MerchantModule } from '#app/modules/merchant/merchant.module';
import { NotificationModule } from '#app/modules/notification/notification.module';
import { OrderModule } from '#app/modules/order/order.module';
import { PaymentModule } from '#app/modules/payment/payment.module';
import { SocialPostModule } from '#app/modules/social-post/social-post.module';
import { StorefrontModule } from '#app/modules/storefront/storefront.module';
import { ThemeModule } from '#app/modules/theme/theme.module';
import { UsersModule } from '#app/modules/users/users.module';

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
      .setTitle('Merchant Commerce Hub — User API')
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
      .setTitle('Merchant Commerce Hub — Merchant API')
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
        CatalogModule,
        FileStorageModule,
        InventoryModule,
        ThemeModule,
        OrderModule,
        PaymentModule,
        SocialPostModule,
        NotificationModule,
      ],
    });
    SwaggerModule.setup('docs/merchant', app, document, {
      jsonDocumentUrl: 'docs/merchant/openapi.json',
    });
    documents.push('/docs/merchant');
  }

  if (envFlag('SWAGGER_STOREFRONT_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('Merchant Commerce Hub — Storefront API')
      .setDescription(
        'Public storefront browsing, checkout sessions, and stock reservations',
      )
      .setVersion('1.0')
      .addApiKey(
        { type: 'apiKey', name: 'X-Checkout-Token', in: 'header' },
        'checkout-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      include: [StorefrontModule, CheckoutModule],
    });
    SwaggerModule.setup('docs/storefront', app, document, {
      jsonDocumentUrl: 'docs/storefront/openapi.json',
    });
    documents.push('/docs/storefront');
  }

  if (envFlag('SWAGGER_ADMIN_ENABLED', !isProduction)) {
    const config = new DocumentBuilder()
      .setTitle('Merchant Commerce Hub — Platform Admin API')
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
