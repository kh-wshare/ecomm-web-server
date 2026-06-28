import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '#app/app.module';
import { correlationIdMiddleware } from '#app/common/middleware/correlation-id.middleware';
import { setupSwagger } from '#app/docs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(correlationIdMiddleware);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerDocuments = setupSwagger(app, configService);

  await app.listen(configService.get<number>('app.port', 3000));
  console.log(`Application running on: ${await app.getUrl()}`);
  for (const path of swaggerDocuments) {
    console.log(`Swagger docs: ${await app.getUrl()}${path}`);
  }
}
bootstrap();
