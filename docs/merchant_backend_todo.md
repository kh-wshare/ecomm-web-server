# Merchant Commerce Hub — Backend Technical TODO

## Purpose

This document lists backend implementation tasks for the Merchant Commerce Hub. The backend must support authentication, merchant isolation, product catalog, real-time inventory, storefront configuration, checkout, payment webhooks, order fulfillment, social commerce, notifications, caching, and audit logs.

---

## 1. Backend Foundation

- [x] Set up backend project structure.
- [x] Add modules:
  - [x] `auth` (implemented in `modules/authenticated`)
  - [x] `users`
  - [x] `roles`
  - [x] `permissions`
  - [x] `sessions`
  - [x] `merchant`
  - [x] `merchant-users`
  - [x] `catalog`
  - [x] `inventory`
  - [x] `storefront`
  - [x] `theme`
  - [x] `checkout`
  - [x] `payment`
  - [x] `order`
  - [x] `social-post`
  - [x] `notification`
  - [x] `audit-log`
- [x] Add shared modules:
  - [x] `database`
  - [x] `redis`
  - [x] `config`
  - [x] `logger`
  - [x] `events`
  - [x] `common`
- [x] Add global exception filter.
- [x] Add global validation pipe.
- [x] Add response formatter.
- [x] Add request correlation ID.
- [x] Add pagination helper.
- [x] Add audit log helper.

> Foundation status: domain modules are registered and ready for implementation.
> Business behavior remains tracked by the later module-specific sections.

---

## 2. Environment Configuration

- [x] Add `DATABASE_URL`.
- [x] Add `REDIS_URL`.
- [x] Add `JWT_ACCESS_SECRET`.
- [x] Add `JWT_REFRESH_SECRET`.
- [x] Add `PAYMENT_WEBHOOK_SECRET`.
- [x] Add payment provider keys.
- [x] Add file storage credentials.
- [x] Add dashboard frontend URL.
- [x] Add public storefront URL.

---

## 3. Merchant Module

### Database

- [x] Create `merchants` table.
  - [x] `id`
  - [x] `name`
  - [x] `slug`
  - [x] `email`
  - [x] `phone`
  - [x] `status`
  - [x] `createdAt`
  - [x] `updatedAt`
  - [x] `deletedAt`

### APIs

- [x] `POST /merchants` — create another merchant for the current account.
- [x] `GET /merchant` — get the active merchant detail.
- [x] `PATCH /merchant` — update the active merchant profile.
- [x] `GET /merchant/dashboard` — get the active merchant dashboard summary.

> Tenant-scoped APIs use the merchant selected in the authenticated session rather
> than accepting an arbitrary merchant ID in the route.

### Rules

- [x] Merchant slug must be unique.
- [ ] Suspended merchant cannot receive new orders.
- [x] Inactive merchant storefront should not be publicly purchasable.
- [x] Merchant data must always be scoped by `merchantId`.

> The storefront rejects inactive and suspended merchants. Order intake enforcement
> remains open until the Order module is implemented.

---

## 4. Product Catalog Module

### Database

- [x] Create `products` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `name`
  - [x] `slug`
  - [x] `description`
  - [x] `sku`
  - [x] `price`
  - [x] `currency`
  - [x] `status`
  - [x] `createdAt`
  - [x] `updatedAt`
  - [x] `deletedAt`

- [x] Create `product_variants` table.
  - [x] `id`
  - [x] `productId`
  - [x] `sku`
  - [x] `name`
  - [x] `price`
  - [x] `attributes`
  - [x] `status`

- [x] Create `product_media` table.
  - [x] `id`
  - [x] `productId`
  - [x] `url`
  - [x] `type`
  - [x] `sortOrder`

- [x] Create `product_channel_visibility` table.
  - [x] `id`
  - [x] `productId`
  - [x] `channel`
  - [x] `isVisible`
  - [x] `isPurchasable`

### Channel Types

```ts
type Channel = 'pos' | 'website' | 'facebook' | 'instagram' | 'tiktok'
```

### APIs

- [x] `POST /products` — create product.
- [x] `GET /products` — list merchant products.
- [x] `GET /products/:id` — get product detail.
- [x] `PATCH /products/:id` — update product.
- [x] `DELETE /products/:id` — soft delete product.
- [x] `PATCH /products/:id/channel-visibility` — enable or disable product by channel.

### Rules

- [x] Product SKU must be unique per merchant.
- [x] Variant SKU must be unique per merchant.
- [x] Deleted product should not be visible on storefront.
- [x] Product cannot be purchased if inactive.
- [x] Product cannot be purchased if channel visibility is disabled.

> Public storefront queries enforce lifecycle, channel, and stock rules. Checkout
> must repeat these checks when that module is implemented.

---

## 5. Inventory Module

### Database

- [x] Create `inventory_stocks` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `productId`
  - [x] `variantId`
  - [x] `totalStock`
  - [x] `reservedStock`
  - [x] `soldStock`
  - [x] `safetyBuffer`
  - [x] `updatedAt`

- [x] Create `inventory_reservations` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `productId`
  - [x] `variantId`
  - [x] `orderId`
  - [x] `checkoutSessionId`
  - [x] `quantity`
  - [x] `status`
  - [x] `expiresAt`
  - [x] `createdAt`

- [x] Create `inventory_movements` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `productId`
  - [x] `variantId`
  - [x] `type`
  - [x] `quantity`
  - [x] `referenceId`
  - [x] `referenceType`
  - [x] `createdBy`
  - [x] `createdAt`

### Reservation Status

```ts
type ReservationStatus = 'active' | 'confirmed' | 'released' | 'expired'
```

### Movement Types

```ts
type InventoryMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'reserved'
  | 'reservation_released'
  | 'sold'
  | 'refund_return'
  | 'manual_adjustment'
```

### Stock Calculation

```ts
availableStock = totalStock - reservedStock - soldStock
onlineSellableStock = totalStock - reservedStock - soldStock - safetyBuffer
```

### APIs

- [x] `GET /inventory` — list inventory items.
- [x] `GET /inventory/:productId` — get product stock detail.
- [x] `POST /inventory/adjust` — manual stock adjustment.
- [x] `POST /inventory/reserve` — reserve stock during checkout.
- [x] `POST /inventory/release` — release reserved stock.
- [x] `POST /inventory/confirm` — confirm reserved stock after payment.

### Reservation Transaction

- [x] Start database transaction.
- [x] Lock inventory row with `SELECT ... FOR UPDATE`.
- [x] Check available stock.
- [x] Create reservation.
- [x] Increase reserved stock.
- [x] Commit transaction.
- [x] Rollback on error.

### Rules

- [x] POS can use physical stock.
- [x] Website must respect safety buffer.
- [x] Social checkout must respect safety buffer.
- [x] Checkout creates temporary reservation.
- [x] Payment success confirms reservation.
- [x] Payment timeout releases reservation.
- [x] Refund may return stock depending on merchant setting.
- [x] Inventory adjustment must create movement history.

> Signed payment webhooks confirm reservations transactionally with payment and order
> state. Order refunds honor the merchant's `returnStockOnRefund` setting and write
> refund-return movements.

### Worker

- [x] Create reservation expiry worker.
- [x] Find expired active reservations.
- [x] Release reserved stock.
- [x] Mark reservation as expired.
- [x] Update checkout session as expired.
- [x] Create inventory movement record.

---

## 6. Storefront Module

### APIs

- [x] `GET /storefront/:merchantSlug` — get public storefront data.
- [x] `GET /storefront/:merchantSlug/products` — get public products.
- [x] `GET /storefront/:merchantSlug/products/:slug` — get public product detail.
- [x] `GET /storefront/:merchantSlug/theme` — get live theme config.

### Rules

- [x] Only live theme config is used by public storefront.
- [x] Draft config must never affect live storefront.
- [x] Products must be filtered by channel visibility.
- [x] Products must be filtered by stock availability.
- [x] Public storefront should use Redis cache where possible.

> Published live theme config is persisted and cached in Redis, with a versioned
> default fallback for merchants that have not published yet. Product availability
> remains uncached intentionally so reservations and stock adjustments are reflected
> immediately.

---

## 7. Theme Builder Module

### Database

- [x] Create `merchant_themes` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `liveConfig`
  - [x] `draftConfig`
  - [x] `customDomain`
  - [x] `publishedAt`
  - [x] `createdAt`
  - [x] `updatedAt`

### APIs

- [x] `GET /themes/current` — get current draft and live theme.
- [x] `PATCH /themes/draft` — save draft theme config.
- [x] `POST /themes/preview` — generate preview theme response.
- [x] `POST /themes/publish` — copy draft config to live config.
- [x] `POST /themes/reset` — reset draft config to default.

### Rules

- [x] Merchant can safely edit draft.
- [x] Publish copies draft config to live config.
- [x] Publishing theme must invalidate storefront cache.
- [x] Theme config should be JSON-schema validated.
- [x] Only authorized users can publish theme.

---

## 8. Checkout Module

### Database

- [x] Create `checkout_sessions` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `customerId`
  - [x] `sourceChannel`
  - [x] `status`
  - [x] `expiresAt`
  - [x] `createdAt`
  - [x] `updatedAt`

### APIs

- [x] `POST /checkout/session` — create checkout session.
- [x] `GET /checkout/session/:id` — get checkout session detail.
- [x] `POST /checkout/session/:id/confirm` — confirm checkout before payment.
- [x] `POST /checkout/session/:id/cancel` — cancel checkout and release reservation.

### Rules

- [x] Checkout creates stock reservation.
- [x] Checkout session must expire.
- [x] Expired session must release reservation.
- [x] Customer cannot pay expired checkout session.
- [x] Checkout source channel must be stored.

> Checkout prices and totals are calculated from server-side product snapshots. Public
> session operations require a one-time secret token whose hash is stored in the
> database. Confirmation is idempotent and creates one pending-payment order. Public
> checkout rejects the POS channel, which requires an authenticated merchant flow.

---

## 9. Order Module

### Database

- [x] Create `orders` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `customerId`
  - [x] `sourceChannel`
  - [x] `orderNumber`
  - [x] `subtotalAmount`
  - [x] `discountAmount`
  - [x] `feeAmount`
  - [x] `totalAmount`
  - [x] `currency`
  - [x] `paymentStatus`
  - [x] `fulfillmentStatus`
  - [x] `createdAt`
  - [x] `updatedAt`

- [x] Create `order_items` table.
  - [x] `id`
  - [x] `orderId`
  - [x] `productId`
  - [x] `variantId`
  - [x] `sku`
  - [x] `name`
  - [x] `quantity`
  - [x] `unitPrice`
  - [x] `totalPrice`

### Statuses

```ts
type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'reserved'
  | 'paid'
  | 'processing'
  | 'fulfilled'
  | 'completed'
  | 'cancelled'
  | 'payment_failed'
  | 'expired'
  | 'refunded'
```

### APIs

- [x] `GET /orders` — list orders.
- [x] `GET /orders/:id` — get order detail.
- [x] `PATCH /orders/:id/status` — update fulfillment status.
- [x] `POST /orders/:id/cancel` — cancel order.
- [x] `POST /orders/:id/refund` — refund order.

### Rules

- [x] Prevent invalid order status transitions.
- [x] Allow merchant to mark order as processing.
- [x] Allow merchant to mark order as fulfilled.
- [x] Allow merchant to cancel unpaid order.
- [x] Prevent cancelling paid order without refund flow.
- [x] Refund must write audit log.
- [x] Refund may return stock depending on merchant setting.

> Order APIs are merchant-scoped and permission-guarded. Fulfillment transitions are
> restricted to paid → processing → fulfilled → completed; signed Payment module
> webhooks own payment-state changes.

---

## 10. Payment Module

### Database

- [x] Create `payment_providers` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `provider`
  - [x] `config`
  - [x] `status`
  - [x] `createdAt`
  - [x] `updatedAt`

- [x] Create `payments` table.
  - [x] `id`
  - [x] `merchantId`
  - [x] `orderId`
  - [x] `provider`
  - [x] `providerTransactionId`
  - [x] `amount`
  - [x] `currency`
  - [x] `status`
  - [x] `paidAt`
  - [x] `createdAt`

- [x] Create `payment_webhook_events` table.
  - [x] `id`
  - [x] `provider`
  - [x] `eventId`
  - [x] `payload`
  - [x] `status`
  - [x] `processedAt`
  - [x] `createdAt`

### APIs

- [x] `POST /payments/providers` — connect payment provider.
- [x] `GET /payments/providers` — list merchant payment providers.
- [x] `PATCH /payments/providers/:provider/disconnect` — disconnect provider.
- [x] `GET /payments/transactions` — list and filter merchant payments.
- [x] `POST /payments/create-intent` — create payment transaction.
- [x] `POST /payments/webhook/:provider` — receive provider webhook.
- [x] `GET /payments/:id` — get payment detail.

### Webhook Logic

- [x] Verify provider webhook signature.
- [x] Store webhook event before processing.
- [x] Check duplicate provider event ID.
- [x] Process payment idempotently.
- [x] Mark payment as confirmed.
- [x] Mark order as paid.
- [x] Confirm inventory reservation.
- [x] Create inventory movement.
- [x] Push merchant notification.
- [x] Write audit log.

### Rules

- [x] Webhook must be idempotent.
- [x] Provider transaction ID must be unique.
- [x] Duplicate webhook must not double-deduct stock.
- [x] Failed webhook must be logged.
- [x] Payment confirmation must be transactional with order update.

> The first provider adapter is `HMAC`. Each merchant has an independently encrypted
> webhook secret; plaintext credentials are neither persisted nor returned. Public
> intent creation requires the checkout secret. Confirmed payment, paid order,
> inventory sale, webhook status, notification, and audit log commit atomically.

---

## 11. Social Commerce Module

### Database

- [x] Create `social_posts` table.
- [x] Create `shoppable_hotspots` table.
- [x] Create `social_post_publish_logs` table.

### APIs

- [x] `POST /social-posts` — create social post draft.
- [x] `GET /social-posts` — list social posts.
- [x] `GET /social-posts/:id` — get social post detail.
- [x] `PATCH /social-posts/:id` — update social post draft.
- [x] `POST /social-posts/:id/hotspots` — add product hotspot.
- [x] `POST /social-posts/:id/publish` — publish to selected platforms.
- [x] `GET /social-posts/:id/logs` — view publish logs.

### Rules

- [x] Social post stores links to products, not copied product data.
- [x] Hotspots must reference active product or variant.
- [x] Old social links must always check live stock availability.
- [x] Publish failures must be logged by platform.
- [x] Website blog/news post should be created when publishing to website.

> Website publishing creates a canonical `website_articles` record and public article
> routes. Stable `/social-links/:hotspotId` URLs resolve current product price,
> lifecycle, channel visibility, variant state, safety buffer, and stock. External
> platforms fail closed with a per-platform log until a credentialed adapter is
> configured; a website success is not rolled back by another platform's failure.

---

## 12. Notification Module

- [x] Create `notifications` table.
- [x] Send notification for new order.
- [x] Send notification for confirmed payment.
- [x] Send notification for low stock.
- [x] Send notification for out-of-stock product.
- [x] Send notification for published social post.
- [x] Send notification for failed payment webhook.
- [x] Add WebSocket support for dashboard.

> The merchant inbox supports pagination, unread counts, mark-one-read, and
> mark-all-read. Stock alerts use a stable dedupe key and are reopened only after
> recovery followed by a new low/out transition. The `/notifications` Socket.IO
> namespace validates the active JWT session and merchant membership before joining a
> tenant room.

### Events

```ts
type RealtimeEvent =
  | 'order.created'
  | 'payment.confirmed'
  | 'inventory.low_stock'
  | 'inventory.out_of_stock'
  | 'social.post_published'
```

---

## 13. Redis Caching

- [x] Cache public storefront theme config.
  - Key: `merchant:{merchantId}:theme:live`
- [x] Cache public product listing.
  - Key: `merchant:{merchantId}:products:public`
- [x] Cache merchant dashboard summary.
  - Key: `merchant:{merchantId}:dashboard`
- [x] Invalidate product cache when product changes.
- [x] Invalidate product cache when stock changes.
- [x] Invalidate theme cache when theme is published.
- [x] Invalidate product cache when visibility changes.

> Public listing and product-detail query variants share one expiring Redis hash
> under the documented product key. Catalog, visibility, and post-commit stock
> mutations delete that hash; dashboard summaries use a 30-second cache and are
> invalidated by merchant and catalog/inventory changes. Redis read/write failures
> fall back to PostgreSQL without failing the request.

---

## 14. Backend Testing

- [x] Unit test product service.
- [x] Unit test inventory calculation.
- [x] Unit test reservation service.
- [x] Unit test payment webhook idempotency.
- [x] Unit test order status transition.
- [x] Unit test permission guard.
- [x] Unit test merchant scope guard.
- [x] Integration test checkout flow.
- [x] Integration test payment success flow.
- [x] Integration test reservation expiry worker.
- [x] Integration test theme publish flow.
- [x] E2E test customer purchase flow.
- [x] E2E test stock reservation race condition.
- [x] E2E test duplicate webhook.

> The unit suite covers product normalization, validation, conflict mapping and cache
> invalidation; inventory availability and safety-buffer arithmetic; reservation
> limits, writes and duplicate targets; permission enforcement; and token-bound
> merchant scope. Jest resolves Prisma's generated NodeNext `.js` specifiers for
> service-level tests.

---

## 15. Backend Definition of Done

A backend task is done when:

- [x] Database migration is added.
- [x] DTO validation is added.
- [x] Service logic is implemented.
- [x] Controller endpoint is implemented.
- [x] Permission check is added.
- [x] Merchant scope check is added.
- [x] Error handling is added.
- [x] Audit log is added where needed.
- [x] Unit or integration test is added.
- [ ] API works in staging.

> Repository evidence closes the implementation criteria: migrations cover the
> delivered modules, request DTOs use validation decorators, tenant APIs are guarded
> by permissions and token-bound merchant scope, mutations write audit records, and
> the full unit and E2E suites pass. Staging remains an external release gate because
> this repository has no staging URL, staging deployment job, or recorded smoke-test
> result; the current deployment workflow targets production.
