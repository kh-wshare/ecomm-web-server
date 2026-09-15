#!/usr/bin/env node
/**
 * Runs the merchant and storefront suites in the order they depend on each
 * other, carrying captured state between them.
 *
 *   merchant setup + catalog  ->  storefront journey  ->  merchant fulfilment
 *
 * The `Endpoints` folders are deliberately not run here: they are a per-operation
 * reference, and many of their requests address records that do not exist in a
 * given database. The flows and the contract folders are the assertions that
 * should hold on every environment.
 *
 *   node scripts/run-api-tests.js [--base-url http://localhost:3000] [--fresh]
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const POSTMAN_DIR = path.join(ROOT, 'docs', 'api', 'postman');

const args = process.argv.slice(2);
const baseUrlIndex = args.indexOf('--base-url');
const baseUrl = baseUrlIndex === -1 ? null : args[baseUrlIndex + 1];
const fresh = args.includes('--fresh');

const RUNS = [
  {
    label: 'merchant · sign in and catalog',
    collection: 'merchant',
    folders: [
      '00 · Setup — sign in',
      '01 · E2E — catalog, delivery and inventory',
    ],
  },
  {
    label: 'storefront · journey and edge cases',
    collection: 'storefront',
    folders: [
      '01 · E2E — browse, cart, checkout, pay',
      '02 · Edge cases — cart tokens and stock',
    ],
  },
  {
    label: 'merchant · fulfilment and edge cases',
    collection: 'merchant',
    folders: [
      '02 · E2E — fulfilment of a storefront order',
      '03 · Edge cases — tenancy and lifecycle',
    ],
  },
  {
    label: 'merchant · contract',
    collection: 'merchant',
    folders: ['Contract · Authentication', 'Contract · Validation'],
  },
  {
    label: 'storefront · contract',
    collection: 'storefront',
    folders: ['Contract · Validation'],
  },
];

function main() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecomm-api-tests-'));
  const environmentFile = path.join(workDir, 'environment.json');

  const environment = JSON.parse(
    fs.readFileSync(
      path.join(POSTMAN_DIR, 'ecomm-local.postman_environment.json'),
      'utf8',
    ),
  );
  if (baseUrl) {
    environment.values.find((value) => value.key === 'baseUrl').value = baseUrl;
  }
  if (fresh) {
    // A merchant's role permissions are provisioned when it is created, so an
    // account made before a permission existed cannot exercise that resource.
    environment.values.find((value) => value.key === 'merchantEmail').value =
      `owner+${Date.now()}@acme-store.test`;
  }
  fs.writeFileSync(environmentFile, JSON.stringify(environment, null, 2));

  let failed = 0;
  for (const run of RUNS) {
    console.log(`\n=== ${run.label}`);
    const result = spawnSync(
      'npx',
      [
        'newman',
        'run',
        path.join(POSTMAN_DIR, `${run.collection}.postman_collection.json`),
        '-e',
        environmentFile,
        ...run.folders.flatMap((folder) => ['--folder', folder]),
        '--export-environment',
        environmentFile,
        '--reporters',
        'cli',
        '--reporter-cli-no-banner',
      ],
      { stdio: 'inherit', cwd: ROOT },
    );
    if (result.status !== 0) failed += 1;
  }

  fs.rmSync(workDir, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`\n${failed} of ${RUNS.length} runs failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${RUNS.length} runs passed.`);
}

main();
