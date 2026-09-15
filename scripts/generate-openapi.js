#!/usr/bin/env node
/**
 * Exports one OpenAPI document per API surface to docs/api/openapi/.
 *
 * Runs against the compiled output in dist/ because DI needs the decorator
 * metadata that `tsc` emits and esbuild-based loaders (tsx) do not. Run
 * `pnpm build` first — `pnpm docs:api` does both.
 */
require('reflect-metadata');

const fs = require('node:fs');
const path = require('node:path');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'api', 'openapi');

async function main() {
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(path.join(distDir, 'app.module.js'))) {
    console.error('dist/ is missing or stale. Run `pnpm build` first.');
    process.exit(1);
  }

  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require(path.join(distDir, 'app.module.js'));
  const { API_SURFACES, buildOpenApiDocument } = require(
    path.join(distDir, 'docs', 'api-surfaces.js'),
  );

  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  await app.init();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const written = [];
  for (const surface of API_SURFACES) {
    const document = buildOpenApiDocument(app, surface);
    const file = path.join(OUT_DIR, `${surface.id}.openapi.json`);
    fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
    written.push({
      surface: surface.id,
      operations: Object.values(document.paths ?? {}).reduce(
        (total, item) =>
          total +
          Object.keys(item).filter((key) =>
            ['get', 'post', 'put', 'patch', 'delete'].includes(key),
          ).length,
        0,
      ),
      file: path.relative(process.cwd(), file),
    });
  }

  await app.close();
  console.table(written);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
