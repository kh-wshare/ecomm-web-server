# POS Backend API Reference

Complete endpoint reference for integrating a POS client (the Flutter POS app
or any other register client) with the backend's native `pos/*` module. This
is the raw backend contract; see [`frontend-integration.md`](./frontend-integration.md)
for how the Next.js POS proxy app wraps a subset of these.

Everything here is also live in Swagger at `/docs/pos` (`SWAGGER_POS_ENABLED=true`),
including request/response schemas — this doc is the narrative map of what
exists and how the pieces fit together; Swagger is the source of truth for
exact field types.

## Conventions

**Auth**: every endpoint below requires `Authorization: Bearer <accessToken>`
(staff JWT with `pos.access`) plus, when a user belongs to multiple merchants,
`X-Merchant-ID: <merchantId>`. Never send a tenant/merchant id any other way —
the backend always resolves it from the JWT/session, not from the request body.

**Response envelope**: identical to the rest of the backend —
`{ statusCode, message, data, meta?, timestamp, path, correlationId }` on
success. Errors thrown as `PosDomainException` come back as:

```json
{
  "statusCode": 409,
  "success": false,
  "error": { "code": "INSUFFICIENT_STOCK", "message": "...", "details": { } }
}
```

Error codes in use: `UNAUTHORIZED`, `PRODUCT_NOT_FOUND`, `INSUFFICIENT_STOCK`,
`ORDER_NOT_FOUND`, `ORDER_ALREADY_CANCELLED`, `PAYMENT_NOT_FOUND`,
`PAYMENT_ALREADY_PAID`, `PAYMENT_PENDING`, `DUPLICATE_REQUEST`,
`IDEMPOTENCY_KEY_REQUIRED`, `INVALID_ORDER_STATE`, `INVALID_PAYMENT_STATE`,
`SYNC_CONFLICT`, `DEVICE_NOT_REGISTERED`, `SESSION_NOT_OPEN`,
`SHIFT_ALREADY_OPEN`, `TABLE_UNAVAILABLE`.

**Idempotency**: endpoints marked 🔒 below require an `Idempotency-Key`
header, scoped `{deviceId}:{something-unique}` (e.g.
`POS-DEVICE-001:local-order-123`). Missing the header on a 🔒 endpoint returns
`IDEMPOTENCY_KEY_REQUIRED`. Replaying the exact same key + body returns the
original response verbatim; the same key with a different body returns
`DUPLICATE_REQUEST`.

**deviceId**: the client-generated install id (e.g. `POS-DEVICE-001`), not the
server-assigned device row id. Register it once via `POST /pos/devices`, then
use that same string everywhere a `deviceId` field is expected (shifts,
orders, WebSocket handshake).

---

## Devices — `pos/devices`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| POST | `/pos/devices` | `pos.device.manage` | Register (or re-register) a device against a branch. Idempotent by `[merchantId, deviceId]` — safe to call again on app reinstall. |
| GET | `/pos/devices` | `pos.device.manage` | List registered devices (`?branchId=`, `?status=`). |

`POST` body: `{ deviceId, deviceName?, platform?, appVersion?, branchId }`.

## Shifts — `pos/shifts`

A cashier must have an OPEN shift before creating orders or taking payments.
One open shift per device at a time (enforced by a DB constraint — a second
open attempt returns `SHIFT_ALREADY_OPEN`).

| Method | Path | Permission | 🔒 | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/pos/shifts` | `pos.shift.manage` | 🔒 | Open a shift: `{ deviceId, openingCash }`. |
| GET | `/pos/shifts/current?deviceId=` | `pos.shift.manage` | | Get the device's current open shift (409/`SESSION_NOT_OPEN` if none — the client must call `POST /pos/shifts` first). |
| POST | `/pos/shifts/:shiftId/close` | `pos.shift.manage` | 🔒 | Close: `{ closingCash, note? }`. Backend computes `expectedCash = openingCash + cashPayments - cashRefunds` and `cashDifference = closingCash - expectedCash`. |

## Orders — `pos/orders`

| Method | Path | Permission | 🔒 | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/pos/orders` | `pos.order.create` | 🔒 | Create an order. Requires an open shift for `deviceId`. |
| GET | `/pos/orders?status=&paymentStatus=&dateFrom=&dateTo=` | `pos.order.create` | | List orders (paginated). |
| GET | `/pos/orders/:orderId` | `pos.order.create` | | Order detail with items, kitchen orders, and computed totals. |
| PATCH | `/pos/orders/:orderId` | `pos.order.update` | 🔒 | Replace the item list; the backend diffs old vs new and only touches the delta (see below). |
| POST | `/pos/orders/:orderId/cancel` | `pos.order.cancel` | 🔒 | Cancel (rejects a paid order — use refund instead). |
| POST | `/pos/orders/:orderId/table` | `pos.table.manage` | | Assign/reassign a table; flips the table to `OCCUPIED`. |

**Create body**:
```json
{
  "localId": "local-order-123",
  "deviceId": "POS-DEVICE-001",
  "tableId": "uuid?",
  "customerId": "uuid?",
  "customerName": "string?",
  "discountAmount": 0,
  "items": [{ "productId": "uuid", "variantId": "uuid?", "quantity": 2, "note": "Less spicy" }]
}
```

**Modify semantics** (`PATCH`): send the full desired item list. The backend
computes per-line deltas against the current order:
- new quantity > current → holds more stock (fails with `INSUFFICIENT_STOCK`
  if unavailable).
- new quantity < current → releases the difference, **but never below
  `sentToKitchenQuantity`** — you cannot retract what's already in the
  kitchen (`INVALID_ORDER_STATE`).
- a product not in the new list → treated as quantity 0 (same floor applies).
- a product not in the old list → reserved as a new line.

**Order detail shape** (abbreviated):
```json
{
  "id": "uuid", "localId": "...", "orderNumber": "ORD-20260912-XXXXXXXXXX",
  "orderStatus": "PENDING_PAYMENT", "paymentStatus": "PARTIAL", "tableId": "uuid?",
  "items": [{
    "id": "uuid", "productId": "uuid", "sku": "...", "name": "...",
    "orderedQuantity": 3, "sentToKitchenQuantity": 3, "preparedQuantity": 2, "cancelledQuantity": 0,
    "unitPrice": "5", "totalPrice": "15"
  }],
  "totals": { "subtotal": "17.5", "discount": "0", "tax": "0", "total": "17.5", "paid": "10", "remaining": "7.5" }
}
```
`totals.paid`/`remaining` are net of refunds, not just gross payments.

## Kitchen — `pos/orders/:orderId/kitchen`, `pos/kitchen/orders`

| Method | Path | Permission | 🔒 | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/pos/orders/:orderId/kitchen` | `pos.kitchen.send` | 🔒 | Send only the items where `orderedQuantity > sentToKitchenQuantity` to the kitchen. No-op (`INVALID_ORDER_STATE`) if nothing is pending. |
| GET | `/pos/kitchen/orders?status=&branchId=` | `pos.kitchen.send` | | List kitchen tickets. |
| PATCH | `/pos/kitchen/orders/:id/status` | `pos.kitchen.update` | | Advance status: `{ status }`. |

Status machine: `PENDING → ACCEPTED → PREPARING → READY → COMPLETED`, or
`CANCELLED` from any non-terminal state. Reaching `READY` increments the
parent order items' `preparedQuantity`; `CANCELLED` increments
`cancelledQuantity`. Setting the same status again is a no-op (idempotent).

## Payments — `pos/orders/:orderId/payments`, `pos/payments/:paymentId`

Split/multi-tender is native: call this endpoint multiple times against the
same order (any mix of `CASH`/`KHQR`) until `remaining` reaches 0.

| Method | Path | Permission | 🔒 | Purpose |
| --- | --- | --- | --- | --- |
| POST | `/pos/orders/:orderId/payments` | `pos.payment.create` | 🔒 | Take a payment: `{ paymentMethod: "CASH"\|"KHQR", amount, currency?, cashReceived?, orderItemIds? }`. |
| GET | `/pos/payments/:paymentId` | `pos.payment.create` | | Payment status. For a still-`PENDING` KHQR payment this actively polls Bakong and auto-confirms on success — poll every 2–5s from the client. |
| POST | `/pos/payments/:paymentId/refund` | `pos.payment.refund` | 🔒 | Refund: `{ amount, reason?, returnStock? }`. Never mutates the original payment; creates a separate refund ledger row. |

`CASH` confirms instantly and returns `{ paymentId, status: "CONFIRMED", amount, change }`.
`KHQR` returns `{ paymentId, status: "PENDING", qr, expiresAt }` — render `qr`
as the QR code and poll `GET /pos/payments/:paymentId`.

The order only reaches `paymentStatus: "PAID"` (and its inventory reservation
converts from held to sold) once `SUM(confirmed payments) - SUM(refunds) >=`
the order total; partial coverage reports `PARTIAL`.

## Tables — `pos/tables`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/pos/tables?branchId=&status=` | `pos.table.manage` | List tables. |
| POST | `/pos/tables` | `pos.table.manage` | Create: `{ branchId, name, code?, seats? }`. |
| PATCH | `/pos/tables/:tableId` | `pos.table.manage` | Update `{ status?, seats? }`. |

Tables flip to `OCCUPIED` automatically when an order is created against them
or assigned via `POST /pos/orders/:orderId/table`; freeing a table back to
`AVAILABLE` is an explicit `PATCH` today (not auto-inferred from
payment/completion).

## Customers — `pos/customers`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/pos/customers?search=` | `pos.customer.manage` | Search by name/phone/email. |
| POST | `/pos/customers` | `pos.customer.manage` | Create: `{ fullName, phone?, email?, note? }`. |

## Bootstrap — `pos/bootstrap`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/pos/bootstrap?deviceId=` | `pos.access` | One aggregate payload for the app's initial local-SQLite seed. |

Returns `{ serverTime, tenant, branch, user, permissions, categories,
products, productVariants, modifiers, tables, paymentMethods, settings,
syncCursor }`. `deviceId` resolves which branch/tables to scope to; omit it
to get the merchant's default branch. `modifiers` is currently always `[]`
(no product-modifier concept exists in this schema yet).

## Sync — `pos/sync`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/pos/sync?cursor=` | `pos.sync.read` | Incremental pull: products, categories, inventory, tables, orders, payments changed since `cursor`. |
| POST | `/pos/sync/batch` | `pos.order.create` | Apply offline-queued operations. |

The cursor is an opaque base64 "changed since" timestamp — pass back the
`cursor` you were given, don't try to interpret it. `hasMore: true` means
re-poll immediately with the new cursor instead of waiting for the next
interval.

`POST /pos/sync/batch` body:
```json
{
  "deviceId": "POS-DEVICE-001",
  "operations": [
    { "id": "sync-op-1", "type": "CREATE_ORDER", "payload": { "localId": "...", "items": [...] } }
  ]
}
```
Each operation gets its own result — one bad operation never fails the
batch:
```json
{
  "results": [
    { "operationId": "sync-op-1", "status": "SUCCESS", "serverId": "uuid" }
  ],
  "cursor": "..."
}
```
`status` is `SUCCESS`, `FAILED` (with `error: { code, message }`), or
`CONFLICT`. **Only `CREATE_ORDER` is wired to a real handler today** —
other operation types return `FAILED` with `error.code: "UNSUPPORTED_OPERATION"`.
Extending this to `UPDATE_ORDER`/`SEND_TO_KITCHEN`/etc. is mechanical (add a
`case` in `PosSyncService.applyOperation` that calls the matching service),
just not built yet — use the direct REST endpoints for those in the
meantime.

## Audit logs — `pos/audit-logs`

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/pos/audit-logs?action=&entityType=&entityId=` | `pos.audit.read` | Paginated audit trail. |

Action vocabulary in use: `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_CANCELLED`,
`ORDER_SENT_TO_KITCHEN`, `PAYMENT_CREATED`, `PAYMENT_SUCCESS`,
`PAYMENT_REFUNDED`, `pos.device.registered`, `pos.session.opened`,
`pos.session.closed`, `pos.kitchen.status_updated`, `pos.table.created`,
`pos.table.updated`, `pos.order.table_assigned`, `pos.customer.created`,
`inventory.adjusted`.

## Realtime — `/ws/pos`

Socket.IO namespace, separate from the dashboard's `/notifications`
namespace (different room granularity, higher event volume).

**Connect**: same origin as the REST API, namespace `/ws/pos`.
```ts
io('https://api.example.com/ws/pos', {
  auth: { token: accessToken, deviceId: 'POS-DEVICE-001' },
});
```
`deviceId` in the handshake is optional but recommended — supplying it joins
a device-scoped room and rejects the connection (`pos.error`, then
disconnect) if that device isn't registered/`ACTIVE` for the merchant.
Without it you still get merchant-wide events, just not device-scoped ones
like `sync.completed`.

On success the server emits `pos.ready`: `{ merchantId, branchId? }`.

**Events** — each is emitted twice: once under the generic name `pos.event`
(`{ type, payload, occurredAt }`) and once under its own type name directly:

| Event | Payload highlights | Room |
| --- | --- | --- |
| `order.updated` | `orderId, orderNumber, branchId, status` | branch |
| `order.kitchen.created` | `orderId, kitchenOrderId, branchId, items` | branch |
| `kitchen.updated` | `kitchenOrderId, orderId, branchId, status` | branch |
| `payment.confirmed` | `orderId, paymentId, branchId, amount` | branch |
| `payment.refunded` | `paymentId, orderId, branchId, amount` | branch |
| `sync.completed` | `deviceId, operationCount` | device |

These are fed by a durable outbox (Postgres table + a relay worker that
publishes to RabbitMQ and then re-emits in-process) rather than published
directly, so an event that's been written is guaranteed to eventually reach
connected clients even across a process restart — it isn't lost if no one is
listening at the exact moment it's created.

---

## Typical flows

**Open register, ring a sale, send to kitchen, take payment:**
```
POST /pos/devices                       (once, on install)
POST /pos/shifts                        { deviceId, openingCash }
POST /pos/orders                        { deviceId, items }
POST /pos/orders/:id/kitchen
PATCH /pos/kitchen/orders/:kitchenId/status   { status: "READY" } (x kitchen)
POST /pos/orders/:id/payments           { paymentMethod: "CASH", amount, cashReceived }
POST /pos/shifts/:shiftId/close         { closingCash }
```

**Dine-in with a table and split tender:**
```
POST /pos/orders                        { deviceId, tableId, items }
POST /pos/orders/:id/payments            { paymentMethod: "CASH", amount: 10 }
POST /pos/orders/:id/payments            { paymentMethod: "KHQR", amount: 7.5 }
GET  /pos/payments/:khqrPaymentId        (poll until CONFIRMED)
```

**Offline device reconnecting:**
```
GET  /pos/sync?cursor=<last-known-cursor>
POST /pos/sync/batch                     { deviceId, operations: [queued CREATE_ORDER ops] }
GET  /pos/sync?cursor=<new-cursor>       (repeat while hasMore)
```

## Known scope boundaries (as of this writing)

- **PayWay/ABA** as a POS-native payment method is not wired — `CASH` and
  `KHQR` are the two supported `paymentMethod` values on
  `POST /pos/orders/:orderId/payments`. (ABA PayWay is fully supported for
  *storefront* checkout via the separate `payment.module`.)
- **Sync batch** only implements `CREATE_ORDER`; other offline operation
  types need a direct REST call instead for now.
- **Product modifiers** (spec's `modifiers` bootstrap field) have no backing
  schema yet — always returns `[]`.
- **`POST /pos/sales`** is deprecated: it bypasses device/shift tracking and
  marks the order paid without creating a `Payment` record. New integrations
  should use the flow above instead.
