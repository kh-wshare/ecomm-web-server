/**
 * Hand-authored, ordered test cases that the per-endpoint requests cannot
 * express: sign-in, full journeys with chained state, and the failure modes
 * that matter (wrong token, empty cart, cross-tenant access).
 *
 * Each folder runs top-to-bottom in Newman.
 */

const { withSetVarHelper } = require('./openapi-to-postman');

function url(raw) {
  const [withoutQuery, query] = raw.split('?');
  const path = withoutQuery.replace('{{baseUrl}}/', '').split('/');
  return {
    raw,
    host: ['{{baseUrl}}'],
    path,
    ...(query
      ? {
          query: query.split('&').map((pair) => {
            const [key, value] = pair.split('=');
            return { key, value };
          }),
        }
      : {}),
  };
}

function request({
  name,
  method,
  path,
  headers = {},
  body,
  tests = [],
  prerequest,
  description,
  noAuth = false,
}) {
  const header = Object.entries(headers).map(([key, value]) => ({
    key,
    value,
    type: 'text',
  }));
  if (body !== undefined && !header.some((h) => h.key === 'Content-Type')) {
    header.unshift({
      key: 'Content-Type',
      value: 'application/json',
      type: 'text',
    });
  }

  const event = [];
  if (prerequest) {
    event.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: withSetVarHelper(prerequest) },
    });
  }
  event.push({
    listen: 'test',
    script: { type: 'text/javascript', exec: withSetVarHelper(tests) },
  });

  return {
    name,
    request: {
      method,
      header,
      ...(body !== undefined
        ? {
            body: {
              mode: 'raw',
              raw:
                typeof body === 'string' ? body : JSON.stringify(body, null, 2),
              options: { raw: { language: 'json' } },
            },
          }
        : {}),
      url: url(path),
      // Postman only honours `auth` inside the request; an item-level `auth`
      // is ignored, which would silently authenticate a "no token" test.
      ...(noAuth ? { auth: { type: 'noauth' } } : {}),
      ...(description ? { description } : {}),
    },
    response: [],
    event,
  };
}

/** Skip a request when a variable the step depends on was never captured. */
function skipUnless(variable, reason) {
  return [
    `if (!pm.variables.get("${variable}")) {`,
    `  console.log("Skipping: ${reason}");`,
    '  if (pm.execution && pm.execution.skipRequest) pm.execution.skipRequest();',
    '}',
  ];
}

const ok = (code) => [
  `pm.test("Returns ${code}", function () {`,
  `  pm.response.to.have.status(${code});`,
  '});',
];

/* ------------------------------------------------------------------ */
/* Merchant                                                            */
/* ------------------------------------------------------------------ */

const merchantSignIn = {
  name: '00 · Setup — sign in',
  description:
    'Run this first. It registers (or reuses) a merchant owner, signs in, and stores `accessToken`, `merchantId` and `merchantSlug` for every other folder.',
  item: [
    request({
      name: 'Register a merchant and owner (idempotent)',
      method: 'POST',
      path: '{{baseUrl}}/auth/register-merchant',
      body: {
        merchantName: 'Acme Store',
        fullName: 'Acme Owner',
        email: '{{merchantEmail}}',
        password: '{{merchantPassword}}',
        phone: '+15551234567',
      },
      description:
        'A 409 means the owner already exists from an earlier run; the sign-in below still works.',
      tests: [
        'pm.test("Registers, or reports the account already exists", function () {',
        '  pm.expect([201, 409]).to.include(pm.response.code);',
        '});',
        '',
        'if (pm.response.code === 201) {',
        '  const body = pm.response.json();',
        '  if (body.data?.accessToken) {',
        '    setVar("accessToken", body.data?.accessToken);',
        '  }',
        '}',
      ],
      noAuth: true,
    }),
    request({
      name: 'Sign in',
      method: 'POST',
      path: '{{baseUrl}}/auth/login',
      body: { email: '{{merchantEmail}}', password: '{{merchantPassword}}' },
      tests: [
        ...ok(200),
        '',
        'const body = pm.response.json();',
        '',
        'pm.test("Issues an access and refresh token", function () {',
        '  pm.expect(body.data?.accessToken).to.be.a("string").and.not.empty;',
        '  pm.expect(body.data?.refreshToken).to.be.a("string").and.not.empty;',
        '});',
        '',
        'pm.test("Reports at least one merchant membership", function () {',
        '  pm.expect(body.data?.merchants).to.be.an("array").that.is.not.empty;',
        '});',
        '',
        'setVar("accessToken", body.data?.accessToken);',
        'setVar("refreshToken", body.data?.refreshToken);',
        'const active = body.data?.activeMerchant || body.data?.merchants[0];',
        'if (active && active.merchant) {',
        '  setVar("merchantId", active.merchant.id);',
        '  setVar("merchantSlug", active.merchant.slug);',
        '}',
      ],
      noAuth: true,
    }),
    request({
      name: 'Who am I',
      method: 'GET',
      path: '{{baseUrl}}/auth/me',
      tests: [
        ...ok(200),
        '',
        'pm.test("Echoes the signed-in account", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data?.user.email).to.eql(pm.variables.get("merchantEmail"));',
        '});',
      ],
    }),
  ],
};

const merchantFlow = {
  name: '01 · E2E — catalog, delivery and inventory',
  description:
    'Builds a sellable catalog from scratch: category, product with tracked stock, a delivery method with a zone, and a stock adjustment. Leaves `productId` and `merchantSlug` set so the Storefront collection can buy the product.',
  item: [
    request({
      name: 'Read the merchant profile',
      method: 'GET',
      path: '{{baseUrl}}/merchant',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      tests: [
        ...ok(200),
        '',
        'const body = pm.response.json();',
        'pm.test("Scoped to the active merchant", function () {',
        '  pm.expect(body.data?.id).to.eql(pm.variables.get("merchantId"));',
        '});',
        'setVar("merchantSlug", body.data?.slug);',
      ],
    }),
    request({
      name: 'Create a category',
      method: 'POST',
      path: '{{baseUrl}}/categories',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: { name: 'Apparel', slug: 'apparel-{{$timestamp}}' },
      tests: [
        'pm.test("Creates the category", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'const body = pm.response.json();',
        'setVar("categoryId", body.data?.id);',
        'pm.test("Returns an id and the submitted name", function () {',
        '  pm.expect(body.data?.id).to.be.a("string");',
        '  pm.expect(body.data?.name).to.eql("Apparel");',
        '});',
      ],
    }),
    request({
      name: 'Create a stock-tracked product',
      method: 'POST',
      path: '{{baseUrl}}/products',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: {
        name: 'Classic T-Shirt',
        slug: 'classic-t-shirt-{{$timestamp}}',
        sku: 'SHIRT-{{$randomInt}}',
        price: '29.99',
        currency: 'USD',
        status: 'ACTIVE',
        categoryId: '{{categoryId}}',
        trackStock: true,
      },
      tests: [
        'pm.test("Creates the product", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'const body = pm.response.json();',
        'setVar("productId", body.data?.id);',
        'setVar("productSlug", body.data?.slug);',
        '',
        'pm.test("Stock tracking is switched on", function () {',
        '  pm.expect(body.data?.trackStock).to.eql(true);',
        '});',
      ],
    }),
    request({
      name: 'Publish it to the website channel',
      method: 'PATCH',
      path: '{{baseUrl}}/products/{{productId}}/channel-visibility',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: {
        channels: [
          { channel: 'WEBSITE', isVisible: true, isPurchasable: true },
        ],
      },
      tests: [
        'pm.test("Accepts the visibility change", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
      ],
    }),
    request({
      name: 'Stock it: +50 units',
      method: 'POST',
      path: '{{baseUrl}}/inventory/adjust',
      headers: {
        'X-Merchant-ID': '{{merchantId}}',
        'Idempotency-Key': '{{$guid}}',
      },
      body: {
        productId: '{{productId}}',
        quantityDelta: 50,
        referenceType: 'purchase_order',
        referenceId: 'postman-e2e-seed',
      },
      tests: [
        'pm.test("Adjustment is applied", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
      ],
    }),
    request({
      name: 'Confirm the on-hand quantity',
      method: 'GET',
      path: '{{baseUrl}}/inventory/{{productId}}',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      tests: [
        ...ok(200),
        '',
        'pm.test("Reports stock for the product just adjusted", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(JSON.stringify(body.data)).to.include(',
        '    pm.variables.get("productId"),',
        '  );',
        '});',
      ],
    }),
    request({
      name: 'Create a delivery method',
      method: 'POST',
      path: '{{baseUrl}}/delivery-methods',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: {
        name: 'Standard delivery',
        code: 'STD-{{$timestamp}}',
        type: 'DELIVERY',
        status: 'ACTIVE',
        isDefault: true,
      },
      tests: [
        'pm.test("Creates the delivery method", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        'setVar("deliveryMethodId", pm.response.json().data?.id);',
      ],
    }),
    request({
      name: 'Add a priced zone',
      method: 'POST',
      path: '{{baseUrl}}/delivery-methods/{{deliveryMethodId}}/zones',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: {
        name: 'Phnom Penh',
        countries: ['KH'],
        baseFee: '2.50',
        isFallback: true,
      },
      tests: [
        'pm.test("Creates the zone", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        'const body = pm.response.json();',
        'if (body.data && body.data?.id) setVar("zoneId", body.data?.id);',
      ],
    }),
  ],
};

const merchantFulfilment = {
  name: '02 · E2E — fulfilment of a storefront order',
  description:
    'Continues after the Storefront collection has produced an order. Set `orderId` (and `orderNumber`) manually, or run the Storefront E2E folder first against the same environment — each request is skipped when `orderId` is unset.',
  item: [
    request({
      name: 'List merchant orders',
      method: 'GET',
      path: '{{baseUrl}}/orders?page=1&limit=10',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      tests: [
        ...ok(200),
        '',
        'const body = pm.response.json();',
        'pm.test("Paginated list", function () {',
        '  pm.expect(body.data).to.be.an("array");',
        '  pm.expect(body.meta).to.include.all.keys("limit", "page", "total");',
        '});',
        '',
        'if (!pm.variables.get("orderId") && (body.data || []).length > 0) {',
        '  setVar("orderId", body.data[0]?.id);',
        '}',
      ],
    }),
    request({
      name: 'Read the order',
      method: 'GET',
      path: '{{baseUrl}}/orders/{{orderId}}',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      prerequest: skipUnless('orderId', 'no order has been created yet'),
      tests: [
        ...ok(200),
        '',
        'pm.test("Belongs to the active merchant", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data?.id).to.eql(pm.variables.get("orderId"));',
        '});',
      ],
    }),
    request({
      name: 'Create a shipment',
      method: 'POST',
      path: '{{baseUrl}}/orders/{{orderId}}/shipments',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: { carrier: 'Local courier', trackingNumber: 'TRK-{{$randomInt}}' },
      prerequest: skipUnless('orderId', 'no order has been created yet'),
      tests: [
        'pm.test("Creates the shipment, or explains why it cannot", function () {',
        '  pm.expect([200, 201, 409]).to.include(pm.response.code);',
        '});',
        'if ([200, 201].includes(pm.response.code)) {',
        '  setVar("shipmentId", pm.response.json().data?.id);',
        '}',
      ],
    }),
    request({
      name: 'Advance the shipment status',
      method: 'PATCH',
      path: '{{baseUrl}}/shipments/{{shipmentId}}/status',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: { status: 'IN_TRANSIT' },
      prerequest: skipUnless('shipmentId', 'no shipment was created'),
      tests: [
        'pm.test("Status transition is accepted or refused explicitly", function () {',
        '  pm.expect([200, 201, 409, 422]).to.include(pm.response.code);',
        '});',
      ],
    }),
  ],
};

const merchantEdgeCases = {
  name: '03 · Edge cases — tenancy and lifecycle',
  description:
    'The failure modes that protect tenant data and stock integrity.',
  item: [
    request({
      name: 'Merchant profile without a token → 401',
      method: 'GET',
      path: '{{baseUrl}}/merchant',
      tests: ok(401),
      noAuth: true,
    }),
    request({
      name: 'Mismatched X-Merchant-ID header → 403',
      method: 'GET',
      path: '{{baseUrl}}/merchant',
      headers: { 'X-Merchant-ID': '00000000-0000-4000-8000-000000000000' },
      description:
        'MerchantScopeGuard rejects a header that disagrees with the token’s merchant claim.',
      tests: ok(403),
    }),
    request({
      name: 'Unknown product id → 404',
      method: 'GET',
      path: '{{baseUrl}}/products/00000000-0000-4000-8000-000000000000',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      tests: ok(404),
    }),
    request({
      name: 'Malformed product id → 400',
      method: 'GET',
      path: '{{baseUrl}}/products/not-a-uuid',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      tests: ok(400),
    }),
    request({
      name: 'Product without required fields → 400',
      method: 'POST',
      path: '{{baseUrl}}/products',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: { name: 'Missing sku and price' },
      tests: [
        ...ok(400),
        '',
        'pm.test("Names the missing fields", function () {',
        '  const text = pm.response.text();',
        '  pm.expect(text).to.match(/sku/i);',
        '  pm.expect(text).to.match(/price/i);',
        '});',
      ],
    }),
    request({
      name: 'Unknown field is stripped, not accepted',
      method: 'POST',
      path: '{{baseUrl}}/categories',
      headers: { 'X-Merchant-ID': '{{merchantId}}' },
      body: {
        name: 'Whitelist probe',
        slug: 'whitelist-probe-{{$timestamp}}',
        merchantId: '00000000-0000-4000-8000-000000000000',
      },
      description:
        'The global ValidationPipe runs with `whitelist: true`, so a forged `merchantId` in the body must never reach the service.',
      tests: [
        'pm.test("Created under the caller’s own merchant", function () {',
        '  pm.expect([200, 201, 400]).to.include(pm.response.code);',
        '  if (pm.response.code === 400) return;',
        '  const body = pm.response.json();',
        '  if (body.data?.merchantId) {',
        '    pm.expect(body.data?.merchantId).to.eql(pm.variables.get("merchantId"));',
        '  }',
        '});',
      ],
    }),
    request({
      name: 'Oversized stock release → rejected',
      method: 'POST',
      path: '{{baseUrl}}/inventory/release',
      headers: {
        'X-Merchant-ID': '{{merchantId}}',
        'Idempotency-Key': '{{$guid}}',
      },
      body: { reservationId: '00000000-0000-4000-8000-000000000000' },
      tests: [
        'pm.test("An unknown reservation is refused", function () {',
        '  pm.expect([400, 404, 409]).to.include(pm.response.code);',
        '});',
      ],
    }),
  ],
};

/* ------------------------------------------------------------------ */
/* Storefront                                                          */
/* ------------------------------------------------------------------ */

const storefrontFlow = {
  name: '01 · E2E — browse, cart, checkout, pay',
  description:
    'The complete shopper journey against `{{merchantSlug}}`. Run the Merchant collection’s setup and E2E folders first (same environment) so there is a visible, in-stock product to buy.',
  item: [
    request({
      name: 'Open the storefront',
      method: 'GET',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}',
      tests: [
        ...ok(200),
        '',
        'pm.test("Returns the public merchant profile", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data).to.have.property("merchant");',
        '});',
      ],
    }),
    request({
      name: 'List visible products',
      method: 'GET',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/products?page=1&limit=10',
      tests: [
        ...ok(200),
        '',
        'const body = pm.response.json();',
        'pm.test("Returns a product list", function () {',
        '  pm.expect(body.data).to.be.an("array");',
        '});',
        '',
        'pm.test("At least one product is purchasable", function () {',
        '  pm.expect(body.data?.length, "seed a product with the Merchant collection first").to.be.above(0);',
        '});',
        '',
        'if ((body.data || []).length > 0) {',
        '  setVar("productId", body.data[0]?.id);',
        '  if (body.data[0]?.slug) setVar("productSlug", body.data[0]?.slug);',
        '}',
      ],
    }),
    request({
      name: 'Read one product',
      method: 'GET',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/products/{{productSlug}}',
      prerequest: skipUnless('productSlug', 'no product was listed'),
      tests: [
        ...ok(200),
        '',
        'pm.test("Slug matches the request", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data?.slug).to.eql(pm.variables.get("productSlug"));',
        '});',
      ],
    }),
    request({
      name: 'Create a cart',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart',
      body: { sourceChannel: 'WEBSITE' },
      tests: [
        'pm.test("Creates the cart", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'const body = pm.response.json();',
        'pm.test("Issues a one-time cart token", function () {',
        '  pm.expect(body.data?.cartToken).to.be.a("string").and.not.empty;',
        '});',
        '',
        'setVar("cartId", body.data?.id);',
        'setVar("cartToken", body.data?.cartToken);',
      ],
    }),
    request({
      name: 'Add a line',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/items',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: { productId: '{{productId}}', quantity: 2 },
      tests: [
        'pm.test("Line is added", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'const body = pm.response.json();',
        'pm.test("Cart totals reflect the line", function () {',
        '  pm.expect(body.data?.itemCount).to.be.above(0);',
        '  pm.expect(Number(body.data?.subtotalAmount)).to.be.above(0);',
        '});',
        'if (body.data?.items && body.data?.items?.length > 0) {',
        '  setVar("itemId", body.data?.items[0].id);',
        '}',
      ],
    }),
    request({
      name: 'Merging the same product keeps one line',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/items',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: { productId: '{{productId}}', quantity: 1 },
      tests: [
        'pm.test("Accepted", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'pm.test("Quantity merged onto the existing line", function () {',
        '  const body = pm.response.json();',
        '  const lines = body.data?.items?.filter(function (line) {',
        '    return line.productId === pm.variables.get("productId");',
        '  });',
        '  pm.expect(lines.length).to.eql(1);',
        '  pm.expect(lines[0].quantity).to.eql(3);',
        '});',
      ],
    }),
    request({
      name: 'Set the shopper contact details',
      method: 'PATCH',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/contact',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: {
        customerName: 'Postman Shopper',
        customerEmail: 'shopper@example.com',
        customerPhone: '+15550000000',
        note: 'Leave at the door',
      },
      tests: [
        ...ok(200),
        '',
        'pm.test("Contact details are stored", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data?.customerEmail).to.eql("shopper@example.com");',
        '});',
      ],
    }),
    request({
      name: 'Save a shipping address',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/addresses',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: {
        label: 'Home',
        recipientName: 'Postman Shopper',
        phone: '+15550000000',
        line1: '123 Test Street',
        city: 'Phnom Penh',
        country: 'KH',
      },
      tests: [
        'pm.test("Address is saved", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        'setVar("addressId", pm.response.json().data?.id);',
      ],
    }),
    request({
      name: 'Assign it to the cart',
      method: 'PATCH',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/addresses/{{addressId}}/assign',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: { type: 'SHIPPING' },
      prerequest: skipUnless('addressId', 'no address was saved'),
      tests: [
        'pm.test("Assignment accepted", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
      ],
    }),
    request({
      name: 'Quote delivery options',
      method: 'GET',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/delivery-options',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      tests: [
        ...ok(200),
        '',
        'const body = pm.response.json();',
        'pm.test("Returns priced options", function () {',
        '  pm.expect(body.data).to.be.an("array");',
        '});',
        'if ((body.data || []).length > 0) {',
        '  setVar("deliveryMethodId", body.data[0]?.methodId);',
        '}',
      ],
    }),
    request({
      name: 'Choose a delivery method',
      method: 'PATCH',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/delivery',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: { deliveryMethodId: '{{deliveryMethodId}}' },
      prerequest: skipUnless(
        'deliveryMethodId',
        'the merchant has no delivery method',
      ),
      tests: [
        'pm.test("Delivery selection accepted", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'pm.test("Shipping is priced into the total", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data).to.have.property("totalAmount");',
        '});',
      ],
    }),
    request({
      name: 'Convert the cart to a checkout session',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/checkout',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: { expiresInMinutes: 15 },
      tests: [
        'pm.test("Checkout session created", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'const body = pm.response.json();',
        'setVar("checkoutSessionId", body.data?.id);',
        'if (body.data?.checkoutToken) {',
        '  setVar("checkoutToken", body.data?.checkoutToken);',
        '}',
        '',
        'pm.test("Session is ACTIVE and carries a total", function () {',
        '  pm.expect(body.data?.status).to.eql("ACTIVE");',
        '  pm.expect(Number(body.data?.totalAmount)).to.be.above(0);',
        '});',
      ],
    }),
    request({
      name: 'Read the checkout session',
      method: 'GET',
      path: '{{baseUrl}}/checkout/session/{{checkoutSessionId}}',
      headers: { 'X-Checkout-Token': '{{checkoutToken}}' },
      prerequest: skipUnless(
        'checkoutSessionId',
        'no checkout session was created',
      ),
      tests: [
        ...ok(200),
        '',
        'pm.test("Lists the payment providers the shopper may use", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data).to.have.property("paymentProviders");',
        '});',
      ],
    }),
    request({
      name: 'Confirm it into an unpaid order',
      method: 'POST',
      path: '{{baseUrl}}/checkout/session/{{checkoutSessionId}}/confirm',
      headers: { 'X-Checkout-Token': '{{checkoutToken}}' },
      prerequest: skipUnless(
        'checkoutSessionId',
        'no checkout session was created',
      ),
      tests: [
        'pm.test("Confirmed", function () {',
        '  pm.expect([200, 201]).to.include(pm.response.code);',
        '});',
        '',
        'const body = pm.response.json();',
        'pm.test("An order is attached to the session", function () {',
        '  pm.expect(body.data?.order).to.be.an("object");',
        '  pm.expect(body.data?.order?.id).to.be.a("string");',
        '});',
        '',
        'if (body.data?.order) {',
        '  setVar("orderId", body.data?.order?.id);',
        '  setVar("orderNumber", body.data?.order.orderNumber);',
        '}',
      ],
    }),
    request({
      name: 'Start a payment',
      method: 'POST',
      path: '{{baseUrl}}/payments/create-intent',
      body: {
        orderId: '{{orderId}}',
        checkoutToken: '{{checkoutToken}}',
        provider: 'KHQR',
      },
      prerequest: skipUnless('orderId', 'no order was confirmed'),
      description:
        'Providers must be connected on the merchant side first; a 409 here means KHQR is not configured for this merchant.',
      tests: [
        'pm.test("Intent created, or the provider is not connected", function () {',
        '  pm.expect([200, 201, 409, 422]).to.include(pm.response.code);',
        '});',
        '',
        'if ([200, 201].includes(pm.response.code)) {',
        '  const body = pm.response.json();',
        '  setVar("paymentId", body.data?.id);',
        '  pm.test("Returns a payable action", function () {',
        '    pm.expect(body.data).to.have.property("status");',
        '  });',
        '}',
      ],
    }),
    request({
      name: 'Poll the payment status',
      method: 'GET',
      path: '{{baseUrl}}/payments/{{paymentId}}/status',
      prerequest: skipUnless('paymentId', 'no payment intent was created'),
      tests: [
        ...ok(200),
        '',
        'pm.test("Reports a payment status", function () {',
        '  const body = pm.response.json();',
        '  pm.expect(body.data).to.have.property("status");',
        '});',
      ],
    }),
    request({
      name: 'Track the order',
      method: 'GET',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/orders/{{orderNumber}}/tracking?customerEmail=shopper@example.com',
      prerequest: skipUnless('orderNumber', 'no order was confirmed'),
      tests: [
        'pm.test("Tracking is available, or not yet shipped", function () {',
        '  pm.expect([200, 404]).to.include(pm.response.code);',
        '});',
      ],
    }),
  ],
};

const storefrontEdgeCases = {
  name: '02 · Edge cases — cart tokens and stock',
  description:
    'Whoever holds the cart token holds the cart, so token handling is the storefront’s whole security model.',
  item: [
    request({
      name: 'Read a cart without a token → 401',
      method: 'GET',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}',
      prerequest: skipUnless('cartId', 'run the E2E folder first'),
      tests: ok(401),
    }),
    request({
      name: 'Read a cart with the wrong token → 401',
      method: 'GET',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}',
      headers: { 'X-Cart-Token': 'not-the-right-token' },
      prerequest: skipUnless('cartId', 'run the E2E folder first'),
      tests: ok(401),
    }),
    request({
      name: 'Unknown merchant slug → 404',
      method: 'GET',
      path: '{{baseUrl}}/storefront/no-such-merchant-xyz',
      tests: ok(404),
    }),
    request({
      name: 'Add a line with quantity 0 → 400',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/items',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: { productId: '{{productId}}', quantity: 0 },
      prerequest: skipUnless('cartId', 'run the E2E folder first'),
      tests: [
        ...ok(400),
        '',
        'pm.test("Explains the quantity bound", function () {',
        '  pm.expect(pm.response.text()).to.match(/quantity/i);',
        '});',
      ],
    }),
    request({
      name: 'Add a product from another merchant → 404 or 409',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{cartId}}/items',
      headers: { 'X-Cart-Token': '{{cartToken}}' },
      body: {
        productId: '00000000-0000-4000-8000-000000000000',
        quantity: 1,
      },
      prerequest: skipUnless('cartId', 'run the E2E folder first'),
      tests: [
        'pm.test("A product outside this storefront cannot be added", function () {',
        '  pm.expect([404, 409]).to.include(pm.response.code);',
        '});',
      ],
    }),
    request({
      name: 'Check out an empty cart → 409',
      method: 'POST',
      path: '{{baseUrl}}/storefront/{{merchantSlug}}/cart/{{emptyCartId}}/checkout',
      headers: { 'X-Cart-Token': '{{emptyCartToken}}' },
      body: { expiresInMinutes: 15 },
      prerequest: [
        'const base = pm.variables.get("baseUrl");',
        'const slug = pm.variables.get("merchantSlug");',
        'pm.sendRequest(',
        '  {',
        '    url: base + "/storefront/" + slug + "/cart",',
        '    method: "POST",',
        '    header: { "Content-Type": "application/json" },',
        '    body: { mode: "raw", raw: JSON.stringify({ sourceChannel: "WEBSITE" }) },',
        '  },',
        '  function (err, res) {',
        '    if (err) return;',
        '    const body = res.json();',
        '    setVar("emptyCartId", body.data?.id);',
        '    setVar("emptyCartToken", body.data?.cartToken);',
        '  },',
        ');',
      ],
      description:
        'Creates a throwaway empty cart in the pre-request script, then tries to check it out.',
      tests: [
        'pm.test("An empty cart cannot become a checkout session", function () {',
        '  pm.expect([409, 400]).to.include(pm.response.code);',
        '});',
      ],
    }),
    request({
      name: 'Unsigned payment webhook → 401',
      method: 'POST',
      path: '{{baseUrl}}/payments/webhook/HMAC',
      body: { event: 'payment.succeeded', data: {} },
      description:
        'Webhooks are public routes, so signature verification is the only thing standing between a stranger and a paid order.',
      tests: [
        'pm.test("An unsigned webhook is refused", function () {',
        '  pm.expect([400, 401, 403]).to.include(pm.response.code);',
        '});',
      ],
    }),
  ],
};

/* ------------------------------------------------------------------ */

const FLOWS = {
  merchant: [
    merchantSignIn,
    merchantFlow,
    merchantFulfilment,
    merchantEdgeCases,
  ],
  storefront: [storefrontFlow, storefrontEdgeCases],
  user: [merchantSignIn],
  pos: [merchantSignIn],
  admin: [],
};

module.exports = { FLOWS };
