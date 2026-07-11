import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '#app/app.module';
import { correlationIdMiddleware } from '#app/common/middleware/correlation-id.middleware';
import { setupSwagger } from '#app/docs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  const allowedOrigins = [
    configService.get<string>('app.dashboardUrl'),
    configService.get<string>('app.storefrontUrl'),
  ].filter((origin): origin is string => Boolean(origin));

  app.use(correlationIdMiddleware);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Checkout-Token',
      'X-Correlation-ID',
      'X-Merchant-ID',
      'X-Payment-Signature',
    ],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerDocuments = setupSwagger(app, configService);

  await app.listen(configService.get<number>('app.port', 3000));
  console.log(`Application running on: ${await app.getUrl()}`);
  for (const path of swaggerDocuments) {
    console.log(`Swagger docs: ${await app.getUrl()}${path}`);
  }
}
void bootstrap();
