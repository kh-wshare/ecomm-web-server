#!/usr/bin/env node
/**
 * Builds one Postman collection per API surface from the exported OpenAPI
 * documents, plus a shared environment file.
 *
 * Run `pnpm docs:openapi` first (or just `pnpm docs:api`, which runs both).
 */
const fs = require('node:fs');
const path = require('node:path');

const { buildCollection } = require('./postman/openapi-to-postman');
const { FLOWS } = require('./postman/flows');
const { validateCollection } = require('./postman/validate');

const ROOT = path.join(__dirname, '..');
const SPEC_DIR = path.join(ROOT, 'docs', 'api', 'openapi');
const OUT_DIR = path.join(ROOT, 'docs', 'api', 'postman');

const SURFACES = [
  { id: 'user', title: 'User API', auth: 'bearer' },
  { id: 'merchant', title: 'Merchant API', auth: 'bearer+merchant' },
  { id: 'pos', title: 'POS API', auth: 'bearer+merchant' },
  { id: 'storefront', title: 'Storefront API', auth: 'storefront-tokens' },
  { id: 'admin', title: 'Admin API', auth: 'bearer' },
];

const ENVIRONMENTS = [
  { name: 'Ecomm — Local', baseUrl: 'http://localhost:3000' },
  { name: 'Ecomm — Staging', baseUrl: 'https://staging.example.com' },
];

const ENVIRONMENT_VARIABLES = [
  ['baseUrl', '', 'default'],
  ['merchantEmail', 'owner@acme-store.test', 'default'],
  ['merchantPassword', 'StrongPassword123!', 'secret'],
  ['merchantSlug', 'acme-store', 'default'],
  ['merchantId', '', 'default'],
  ['accessToken', '', 'secret'],
  ['refreshToken', '', 'secret'],
  ['cartToken', '', 'secret'],
  ['checkoutToken', '', 'secret'],
  ['cartId', '', 'default'],
  ['productId', '', 'default'],
  ['productSlug', '', 'default'],
  ['categoryId', '', 'default'],
  ['orderId', '', 'default'],
  ['orderNumber', '', 'default'],
  ['deliveryMethodId', '', 'default'],
  ['addressId', '', 'default'],
  ['paymentId', '', 'default'],
  ['checkoutSessionId', '', 'default'],
  ['shipmentId', '', 'default'],
];

function countRequests(items) {
  return items.reduce(
    (total, item) =>
      total + (Array.isArray(item.item) ? countRequests(item.item) : 1),
    0,
  );
}

function countAssertions(items) {
  return items.reduce((total, item) => {
    if (Array.isArray(item.item)) return total + countAssertions(item.item);
    const scripts = (item.event ?? [])
      .filter((event) => event.listen === 'test')
      .flatMap((event) => event.script.exec);
    return total + scripts.filter((line) => line.includes('pm.test(')).length;
  }, 0);
}

function writeEnvironment(environment) {
  const file = path.join(
    OUT_DIR,
    `${environment.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}.postman_environment.json`,
  );
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        name: environment.name,
        values: ENVIRONMENT_VARIABLES.map(([key, value, type]) => ({
          key,
          value: key === 'baseUrl' ? environment.baseUrl : value,
          type,
          enabled: true,
        })),
        _postman_variable_scope: 'environment',
      },
      null,
      2,
    )}\n`,
  );
  return path.relative(ROOT, file);
}

function main() {
  if (!fs.existsSync(SPEC_DIR)) {
    console.error(
      'docs/api/openapi is missing. Run `pnpm docs:openapi` first.',
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const summary = [];
  const problems = [];

  for (const surface of SURFACES) {
    const specFile = path.join(SPEC_DIR, `${surface.id}.openapi.json`);
    if (!fs.existsSync(specFile)) {
      console.warn(`Skipping ${surface.id}: ${specFile} not found`);
      continue;
    }

    const document = JSON.parse(fs.readFileSync(specFile, 'utf8'));
    const collection = buildCollection(document, surface, {
      prefixFolders: FLOWS[surface.id] ?? [],
    });

    problems.push(...validateCollection(collection, surface.id));

    const file = path.join(OUT_DIR, `${surface.id}.postman_collection.json`);
    fs.writeFileSync(file, `${JSON.stringify(collection, null, 2)}\n`);

    summary.push({
      collection: surface.id,
      requests: countRequests(collection.item),
      assertions: countAssertions(collection.item),
      file: path.relative(ROOT, file),
    });
  }

  for (const environment of ENVIRONMENTS) {
    summary.push({
      collection: 'environment',
      file: writeEnvironment(environment),
    });
  }

  console.table(summary);

  if (problems.length > 0) {
    console.error(
      `\n${problems.length} problem(s) in the generated collections:`,
    );
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
}

main();
