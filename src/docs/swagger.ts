import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from '#app/modules/authenticated/auth.module';
import { MerchantModule } from '#app/modules/merchant/merchant.module';
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
      include: [MerchantModule],
    });
    SwaggerModule.setup('docs/merchant', app, document, {
      jsonDocumentUrl: 'docs/merchant/openapi.json',
    });
    documents.push('/docs/merchant');
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
