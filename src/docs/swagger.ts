import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';

import { API_SURFACES, buildOpenApiDocument } from './api-surfaces';

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

  for (const surface of API_SURFACES) {
    const fallback = surface.enabledByDefaultInProduction || !isProduction;
    if (!envFlag(surface.envFlag, fallback)) continue;

    SwaggerModule.setup(
      surface.docsPath,
      app,
      buildOpenApiDocument(app, surface),
      {
        jsonDocumentUrl: `${surface.docsPath}/openapi.json`,
      },
    );
    documents.push(`/${surface.docsPath}`);
  }

  return documents;
}
