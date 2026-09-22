/**
 * Converts an exported OpenAPI document into a Postman v2.1 collection.
 *
 * Every operation becomes one happy-path request with assertions, and ids
 * returned by create calls are captured into collection variables so a whole
 * folder can be run top-to-bottom with Newman.
 */

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const SUCCESS_CODES = ['200', '201', '202', '204'];

/** Path params that already carry a meaningful name are used verbatim. */
const SELF_NAMED_PARAMS = new Set([
  'merchantSlug',
  'productSlug',
  'orderNumber',
  'provider',
  'purpose',
  'date',
  'filename',
  'slug',
]);

/** Paths where the segment-based guess for `{id}` reads badly. */
const PATH_VARIABLE_OVERRIDES = {
  '/checkout/session/{id}': 'checkoutSessionId',
  '/checkout/session/{id}/confirm': 'checkoutSessionId',
  '/checkout/session/{id}/cancel': 'checkoutSessionId',
};

function singularize(word) {
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(ses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function toCamel(value) {
  return value
    .split(/[-_]/)
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
}

/** `/products/{id}` -> `productId`, `/delivery-methods/{id}/zones/{zoneId}` -> `zoneId`. */
function pathVariableName(openApiPath, paramName) {
  if (PATH_VARIABLE_OVERRIDES[openApiPath] && paramName === 'id') {
    return PATH_VARIABLE_OVERRIDES[openApiPath];
  }
  if (paramName !== 'id') {
    return SELF_NAMED_PARAMS.has(paramName) ? paramName : toCamel(paramName);
  }

  const segments = openApiPath.split('/').filter(Boolean);
  const index = segments.indexOf(`{${paramName}}`);
  const previous = segments
    .slice(0, index === -1 ? segments.length : index)
    .reverse()
    .find((segment) => !segment.startsWith('{'));
  if (!previous) return 'id';
  return `${toCamel(singularize(previous))}Id`;
}

/** Resource a successful POST on this path creates, e.g. `/products` -> `productId`. */
function createdResourceVariable(openApiPath) {
  const segments = openApiPath.split('/').filter(Boolean);
  const last = [...segments]
    .reverse()
    .find((segment) => !segment.startsWith('{'));
  if (!last) return null;
  return `${toCamel(singularize(last))}Id`;
}

/**
 * Postman resolves environment variables ahead of collection variables, so a
 * captured value must be written to whichever scope already declares the key —
 * otherwise an empty environment entry shadows it. Reads go through
 * `pm.variables`, which already applies that precedence.
 */
const SET_VAR_HELPER = [
  'const setVar = (key, value) => {',
  '  if (value === undefined || value === null) return;',
  '  if (pm.environment.has(key)) pm.environment.set(key, value);',
  '  else pm.collectionVariables.set(key, value);',
  '};',
  '',
];

function withSetVarHelper(lines) {
  return lines.some((line) => line.includes('setVar('))
    ? [...SET_VAR_HELPER, ...lines]
    : lines;
}

function resolveSchema(document, schema, seen = new Set()) {
  if (!schema || typeof schema !== 'object') return schema;
  if (!schema.$ref) return schema;
  if (seen.has(schema.$ref)) return { type: 'object', properties: {} };
  seen.add(schema.$ref);
  const name = schema.$ref.replace('#/components/schemas/', '');
  return resolveSchema(document, document.components?.schemas?.[name], seen);
}

const KNOWN_ID_VARIABLES = new Set([
  'addressId',
  'branchId',
  'cartId',
  'categoryId',
  'checkoutSessionId',
  'customerId',
  'deliveryMethodId',
  'deviceId',
  'hotspotId',
  'itemId',
  'merchantId',
  'orderId',
  'paymentId',
  'productId',
  'roleId',
  'shiftId',
  'shipmentId',
  'socialPostId',
  'tableId',
  'userId',
  'variantId',
  'zoneId',
]);

function exampleValue(document, schema, propertyName = '', depth = 0) {
  const resolved = resolveSchema(document, schema);
  if (!resolved || depth > 4) return null;
  if (resolved.example !== undefined) return resolved.example;
  if (resolved.default !== undefined) return resolved.default;
  if (Array.isArray(resolved.enum) && resolved.enum.length > 0) {
    return resolved.enum[0];
  }

  // The Swagger CLI plugin emits `type: object` for nullable uuid columns.
  const looksLikeId =
    resolved.format === 'uuid' || /(^|[a-z])Id$/.test(propertyName);
  if (looksLikeId && resolved.type !== 'array') {
    return KNOWN_ID_VARIABLES.has(propertyName)
      ? `{{${propertyName}}}`
      : '00000000-0000-4000-8000-000000000000';
  }

  switch (resolved.type) {
    case 'array':
      return [exampleValue(document, resolved.items, propertyName, depth + 1)];
    case 'number':
    case 'integer':
      return resolved.minimum ?? 1;
    case 'boolean':
      return false;
    case 'object': {
      const properties = resolved.properties ?? {};
      const output = {};
      for (const [key, value] of Object.entries(properties)) {
        output[key] = exampleValue(document, value, key, depth + 1);
      }
      return output;
    }
    case 'string':
    default:
      if (resolved.format === 'date-time') return new Date(0).toISOString();
      if (resolved.format === 'email') return 'shopper@example.com';
      if (resolved.format === 'binary') return '';
      return propertyName ? `sample-${toCamel(propertyName)}` : 'string';
  }
}

function requestBodyFor(document, operation) {
  const content = operation.requestBody?.content;
  if (!content) return undefined;

  if (content['multipart/form-data']) {
    const schema = resolveSchema(
      document,
      content['multipart/form-data'].schema,
    );
    const formdata = Object.entries(schema.properties ?? {}).map(
      ([key, value]) => {
        const resolved = resolveSchema(document, value);
        if (resolved.format === 'binary') {
          return {
            key,
            type: 'file',
            src: [],
            description: 'Pick a local file',
          };
        }
        return {
          key,
          type: 'text',
          value: String(exampleValue(document, resolved, key) ?? ''),
        };
      },
    );
    return { mode: 'formdata', formdata };
  }

  const json = content['application/json'];
  if (!json) return undefined;
  const example = exampleValue(document, json.schema);
  return {
    mode: 'raw',
    raw: JSON.stringify(example ?? {}, null, 2),
    options: { raw: { language: 'json' } },
  };
}

/**
 * True when the operation declares that no credentials are required —
 * either `security: []` or a requirement object with no schemes, which is how
 * `@Public()` surfaces in the document.
 */
function declaresNoAuth(operation) {
  const security = operation.security;
  if (!Array.isArray(security)) return false;
  return (
    security.length === 0 ||
    security.some((requirement) => Object.keys(requirement).length === 0)
  );
}

function authHeaders(surfaceAuth, operation) {
  const headers = [];
  const isBearer =
    surfaceAuth === 'bearer' || surfaceAuth === 'bearer+merchant';

  if (isBearer && !declaresNoAuth(operation)) {
    headers.push({
      key: 'Authorization',
      value: 'Bearer {{accessToken}}',
      type: 'text',
    });
  }
  return headers;
}

function headerParameters(document, operation, surfaceAuth) {
  const seen = new Set();
  const headers = [];

  for (const parameter of operation.parameters ?? []) {
    if (parameter.in !== 'header') continue;
    const lower = parameter.name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    // The bearer token is added from the surface's auth scheme instead.
    if (lower === 'authorization') continue;

    const variable = {
      'X-Cart-Token': '{{cartToken}}',
      'X-Checkout-Token': '{{checkoutToken}}',
      'x-merchant-id': '{{merchantId}}',
      'x-payment-signature': '{{paymentSignature}}',
      'idempotency-key': '{{$guid}}',
    }[lower];

    headers.push({
      key: parameter.name,
      value:
        variable ??
        String(exampleValue(document, parameter.schema, parameter.name) ?? ''),
      type: 'text',
      disabled: !parameter.required && !variable,
      description: parameter.description,
    });
  }

  if (
    operation.requestBody?.content?.['application/json'] &&
    !seen.has('content-type')
  ) {
    headers.unshift({
      key: 'Content-Type',
      value: 'application/json',
      type: 'text',
    });
  }

  headers.push(...authHeaders(surfaceAuth, operation));
  return headers;
}

function queryParameters(document, operation) {
  return (operation.parameters ?? [])
    .filter((parameter) => parameter.in === 'query')
    .map((parameter) => ({
      key: parameter.name,
      value: String(
        exampleValue(document, parameter.schema, parameter.name) ?? '',
      ),
      disabled: !parameter.required,
      description: parameter.description,
    }));
}

function buildUrl(openApiPath, operation, document) {
  const pathSegments = openApiPath.split('/').filter(Boolean);
  const variables = [];

  const rendered = pathSegments.map((segment) => {
    const match = segment.match(/^\{(.+)\}$/);
    if (!match) return segment;
    const name = pathVariableName(openApiPath, match[1]);
    variables.push({
      key: name,
      value: `{{${name}}}`,
      description: `Path parameter \`${match[1]}\``,
    });
    return `:${name}`;
  });

  const query = queryParameters(document, operation);
  return {
    raw: `{{baseUrl}}/${rendered.join('/')}${
      query.length > 0
        ? `?${query.map((item) => `${item.key}=${item.value}`).join('&')}`
        : ''
    }`,
    host: ['{{baseUrl}}'],
    path: rendered,
    ...(query.length > 0 ? { query } : {}),
    ...(variables.length > 0 ? { variable: variables } : {}),
  };
}

function successCodes(operation) {
  const documented = Object.keys(operation.responses ?? {}).filter((code) =>
    SUCCESS_CODES.includes(code),
  );
  return documented.length > 0 ? documented.map(Number) : [200, 201];
}

function testScript(openApiPath, method, operation) {
  const expected = successCodes(operation);
  const lines = [
    `const expected = ${JSON.stringify(expected)};`,
    '',
    'pm.test("Responds with a documented success code", function () {',
    '  pm.expect(expected, "body: " + pm.response.text().slice(0, 400)).to.include(',
    '    pm.response.code,',
    '  );',
    '});',
    '',
    'pm.test("Responds within 2000ms", function () {',
    '  pm.expect(pm.response.responseTime).to.be.below(2000);',
    '});',
    '',
    'if (expected.includes(pm.response.code) && pm.response.code !== 204) {',
    '  const body = pm.response.json();',
    '',
    '  pm.test("Uses the standard response envelope", function () {',
    '    pm.expect(body).to.have.property("statusCode", pm.response.code);',
    '    pm.expect(body).to.have.property("data");',
    '    pm.expect(body).to.have.property("timestamp");',
    '    pm.expect(body).to.have.property("path");',
    '  });',
  ];

  if (method === 'get' && !/\{[^}]+\}$/.test(openApiPath)) {
    lines.push(
      '',
      '  pm.test("List payloads carry pagination meta when paginated", function () {',
      '    if (Array.isArray(body.data) && body.meta) {',
      '      pm.expect(body.meta).to.include.all.keys("limit", "page", "total");',
      '    }',
      '  });',
    );
  }

  const captures = [];
  const created = createdResourceVariable(openApiPath);
  if (method === 'post' && created) {
    captures.push(
      `    if (body.data?.id) setVar("${created}", body.data?.id);`,
    );
  }
  captures.push(
    '    if (body.data?.cartToken) setVar("cartToken", body.data?.cartToken);',
    '    if (body.data?.checkoutToken) setVar("checkoutToken", body.data?.checkoutToken);',
    '    if (body.data?.accessToken) setVar("accessToken", body.data?.accessToken);',
    '    if (body.data?.refreshToken) setVar("refreshToken", body.data?.refreshToken);',
    '    if (body.data?.order && body.data?.order?.id) setVar("orderId", body.data?.order?.id);',
    '    if (body.data?.orderNumber) setVar("orderNumber", body.data?.orderNumber);',
  );

  lines.push(
    '',
    '  pm.test("Chained ids are captured for later requests", function () {',
    ...captures,
    '  });',
    '}',
  );

  return withSetVarHelper(lines);
}

function operationName(method, openApiPath, operation) {
  const summary = operation.summary?.trim();
  return summary && summary.length > 0
    ? summary
    : `${method.toUpperCase()} ${openApiPath}`;
}

function buildItem(document, surface, openApiPath, method, operation) {
  const description = [
    operation.description,
    `\`${method.toUpperCase()} ${openApiPath}\``,
    operation.operationId ? `Operation id: \`${operation.operationId}\`` : null,
    'Documented responses: ' +
      Object.entries(operation.responses ?? {})
        .map(([code, response]) =>
          response.description
            ? `**${code}** ${response.description}`
            : `**${code}**`,
        )
        .join(' · '),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    name: operationName(method, openApiPath, operation),
    request: {
      method: method.toUpperCase(),
      header: headerParameters(document, operation, surface.auth),
      ...(requestBodyFor(document, operation)
        ? { body: requestBodyFor(document, operation) }
        : {}),
      url: buildUrl(openApiPath, operation, document),
      description,
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: testScript(openApiPath, method, operation),
        },
      },
    ],
  };
}

const PROBE_PATH_VALUE = '00000000-0000-4000-8000-000000000000';

/**
 * Probes assert how a request is *refused*, so their path variables must
 * resolve to something — an unset `{{variable}}` collapses the path and the
 * router answers 404 before any guard or pipe runs.
 */
function pinPathVariables(url, document, operation) {
  for (const variable of url.variable ?? []) {
    const parameter = (operation.parameters ?? []).find(
      (candidate) =>
        candidate.in === 'path' &&
        pathVariableNameMatches(candidate.name, variable.key),
    );
    const example = parameter
      ? exampleValue(document, parameter.schema, parameter.name)
      : null;
    variable.value =
      example && !String(example).startsWith('{{')
        ? String(example)
        : PROBE_PATH_VALUE;
  }
  return url;
}

function pathVariableNameMatches(parameterName, variableKey) {
  return (
    parameterName === variableKey ||
    toCamel(parameterName) === variableKey ||
    variableKey.endsWith('Id')
  );
}

/** Auth and validation checks derived from the same operations. */
function buildContractFolders(document, surface) {
  const protectedProbes = [];
  const validationProbes = [];
  const seenTagsForValidation = new Set();

  // One probe per tag, preferring a collection route: a route with path
  // parameters would 404 on the unset variable before the guard ever runs.
  const authCandidates = new Map();

  for (const [openApiPath, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const tag = operation.tags?.[0] ?? 'Default';
      const requiresBearer =
        (surface.auth === 'bearer' || surface.auth === 'bearer+merchant') &&
        !declaresNoAuth(operation);

      if (requiresBearer && method === 'get') {
        const hasPathParameters = openApiPath.includes('{');
        const existing = authCandidates.get(tag);
        if (!existing || (existing.hasPathParameters && !hasPathParameters)) {
          authCandidates.set(tag, {
            openApiPath,
            operation,
            hasPathParameters,
          });
        }
      }

      const hasJsonBody = Boolean(
        operation.requestBody?.content?.['application/json'],
      );
      const requiredProperties =
        resolveSchema(
          document,
          operation.requestBody?.content?.['application/json']?.schema,
        )?.required ?? [];

      if (
        method === 'post' &&
        hasJsonBody &&
        requiredProperties.length > 0 &&
        !seenTagsForValidation.has(tag)
      ) {
        seenTagsForValidation.add(tag);
        validationProbes.push({
          name: `${tag} · rejects an empty body`,
          request: {
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json', type: 'text' },
              ...headerParameters(document, operation, surface.auth),
            ],
            body: {
              mode: 'raw',
              raw: '{}',
              options: { raw: { language: 'json' } },
            },
            url: pinPathVariables(
              buildUrl(openApiPath, operation, document),
              document,
              operation,
            ),
            description: `\`POST ${openApiPath}\` requires ${requiredProperties
              .map((property) => `\`${property}\``)
              .join(', ')}.`,
          },
          response: [],
          event: [
            {
              listen: 'test',
              script: {
                type: 'text/javascript',
                exec: [
                  'pm.test("Missing required fields are not accepted", function () {',
                  '  // 401/403 mean a guard refused first, which is also not acceptance.',
                  '  pm.expect([400, 401, 403, 422]).to.include(pm.response.code);',
                  '});',
                  'pm.test("Validation errors name the offending fields", function () {',
                  '  if (pm.response.code !== 400) return;',
                  '  const body = pm.response.json();',
                  '  pm.expect(JSON.stringify(body)).to.match(/message|errors/i);',
                  '});',
                ],
              },
            },
          ],
        });
      }
    }
  }

  for (const [tag, { openApiPath, operation }] of authCandidates) {
    const url = pinPathVariables(
      buildUrl(openApiPath, operation, document),
      document,
      operation,
    );

    protectedProbes.push({
      name: `${tag} · rejects a missing token`,
      request: {
        method: 'GET',
        header: [],
        // Without this the collection-level bearer auth is applied and the
        // probe silently tests an *authenticated* request instead.
        auth: { type: 'noauth' },
        url,
        description: `\`GET ${openApiPath}\` without an Authorization header must not leak tenant data.`,
      },
      response: [],
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'pm.test("Unauthenticated request is rejected with 401", function () {',
              '  pm.response.to.have.status(401);',
              '});',
            ],
          },
        },
      ],
    });
  }

  const folders = [];
  if (protectedProbes.length > 0) {
    folders.push({
      name: 'Contract · Authentication',
      description:
        'Each protected resource must reject an unauthenticated caller rather than return data.',
      item: protectedProbes,
    });
  }
  if (validationProbes.length > 0) {
    folders.push({
      name: 'Contract · Validation',
      description:
        'The global ValidationPipe runs with `whitelist` and `transform`; required fields must be enforced server-side.',
      item: validationProbes,
    });
  }
  return folders;
}

function collectionVariables(document, surface, extra = {}) {
  const names = new Set(['baseUrl']);
  for (const [openApiPath, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (!pathItem[method]) continue;
      for (const segment of openApiPath.split('/')) {
        const match = segment.match(/^\{(.+)\}$/);
        if (match) names.add(pathVariableName(openApiPath, match[1]));
      }
    }
  }

  if (surface.auth !== 'storefront-tokens') {
    names.add('accessToken');
    names.add('refreshToken');
    names.add('merchantEmail');
    names.add('merchantPassword');
  }
  if (surface.auth === 'bearer+merchant') names.add('merchantId');
  if (surface.auth === 'storefront-tokens') {
    names.add('cartToken');
    names.add('checkoutToken');
    names.add('merchantSlug');
  }

  const defaults = {
    baseUrl: 'http://localhost:3000',
    merchantEmail: 'owner@acme-store.test',
    merchantPassword: 'StrongPassword123!',
    merchantSlug: 'acme-store',
    ...extra,
  };

  return [...names].sort().map((key) => ({
    key,
    value: defaults[key] ?? '',
    type: 'string',
  }));
}

/** Postman only substitutes variables it knows about, so declare every `{{ref}}`. */
function declareReferencedVariables(collection) {
  const declared = new Set(collection.variable.map((entry) => entry.key));
  const referenced = new Set();
  JSON.stringify(collection).replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, name) => {
    referenced.add(name);
    return '';
  });

  for (const name of [...referenced].sort()) {
    if (declared.has(name) || name.startsWith('$')) continue;
    collection.variable.push({ key: name, value: '', type: 'string' });
  }
  return collection;
}

function buildCollection(document, surface, options = {}) {
  const folders = new Map();

  for (const [openApiPath, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const tag = operation.tags?.[0] ?? 'Default';
      if (!folders.has(tag)) folders.set(tag, []);
      folders
        .get(tag)
        .push(buildItem(document, surface, openApiPath, method, operation));
    }
  }

  const endpointFolders = [...folders.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, item]) => ({ name, item }));

  const item = [
    ...(options.prefixFolders ?? []),
    {
      name: 'Endpoints',
      description:
        'One request per documented operation, each asserting the response envelope and capturing ids for the next call.',
      item: endpointFolders,
    },
    ...buildContractFolders(document, surface),
  ];

  const collection = {
    info: {
      name: `${surface.title} — ${document.info.version}`,
      description: [
        document.info.description,
        '',
        `Generated from \`docs/api/openapi/${surface.id}.openapi.json\` by \`pnpm docs:postman\`. Edit the generator, not this file.`,
      ].join('\n'),
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item,
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Returns JSON", function () {',
            '  pm.expect(pm.response.headers.get("Content-Type") || "").to.include(',
            '    "application/json",',
            '  );',
            '});',
          ],
        },
      },
    ],
    variable: collectionVariables(document, surface, options.variableDefaults),
  };

  if (surface.auth === 'bearer' || surface.auth === 'bearer+merchant') {
    collection.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    };
  }

  return declareReferencedVariables(collection);
}

module.exports = {
  buildCollection,
  withSetVarHelper,
  buildUrl,
  pathVariableName,
  createdResourceVariable,
  exampleValue,
  HTTP_METHODS,
};
