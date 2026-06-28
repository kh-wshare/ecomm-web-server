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
  - [x] `merchant` (implemented in `modules/merchants`)
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

- [ ] Create `merchants` table.
  - [ ] `id`
  - [ ] `name`
  - [ ] `slug`
  - [ ] `email`
  - [ ] `phone`
  - [ ] `status`
  - [ ] `createdAt`
  - [ ] `updatedAt`
  - [ ] `deletedAt`

### APIs

- [ ] `POST /merchants` — create merchant profile.
- [ ] `GET /merchants/:id` — get merchant detail.
- [ ] `PATCH /merchants/:id` — update merchant profile.
- [ ] `GET /merchants/:id/dashboard` — get merchant dashboard summary.

### Rules

- [ ] Merchant slug must be unique.
- [ ] Suspended merchant cannot receive new orders.
- [ ] Inactive merchant storefront should not be publicly purchasable.
- [ ] Merchant data must always be scoped by `merchantId`.

---

## 4. Product Catalog Module

### Database

- [ ] Create `products` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `name`
  - [ ] `slug`
  - [ ] `description`
  - [ ] `sku`
  - [ ] `price`
  - [ ] `currency`
  - [ ] `status`
  - [ ] `createdAt`
  - [ ] `updatedAt`
  - [ ] `deletedAt`

- [ ] Create `product_variants` table.
  - [ ] `id`
  - [ ] `productId`
  - [ ] `sku`
  - [ ] `name`
  - [ ] `price`
  - [ ] `attributes`
  - [ ] `status`

- [ ] Create `product_media` table.
  - [ ] `id`
  - [ ] `productId`
  - [ ] `url`
  - [ ] `type`
  - [ ] `sortOrder`

- [ ] Create `product_channel_visibility` table.
  - [ ] `id`
  - [ ] `productId`
  - [ ] `channel`
  - [ ] `isVisible`
  - [ ] `isPurchasable`

### Channel Types

```ts
type Channel = 'pos' | 'website' | 'facebook' | 'instagram' | 'tiktok'
```

### APIs

- [ ] `POST /products` — create product.
- [ ] `GET /products` — list merchant products.
- [ ] `GET /products/:id` — get product detail.
- [ ] `PATCH /products/:id` — update product.
- [ ] `DELETE /products/:id` — soft delete product.
- [ ] `PATCH /products/:id/channel-visibility` — enable or disable product by channel.

### Rules

- [ ] Product SKU must be unique per merchant.
- [ ] Variant SKU must be unique per merchant.
- [ ] Deleted product should not be visible on storefront.
- [ ] Product cannot be purchased if inactive.
- [ ] Product cannot be purchased if channel visibility is disabled.

---

## 5. Inventory Module

### Database

- [ ] Create `inventory_stocks` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `productId`
  - [ ] `variantId`
  - [ ] `totalStock`
  - [ ] `reservedStock`
  - [ ] `soldStock`
  - [ ] `safetyBuffer`
  - [ ] `updatedAt`

- [ ] Create `inventory_reservations` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `productId`
  - [ ] `variantId`
  - [ ] `orderId`
  - [ ] `checkoutSessionId`
  - [ ] `quantity`
  - [ ] `status`
  - [ ] `expiresAt`
  - [ ] `createdAt`

- [ ] Create `inventory_movements` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `productId`
  - [ ] `variantId`
  - [ ] `type`
  - [ ] `quantity`
  - [ ] `referenceId`
  - [ ] `referenceType`
  - [ ] `createdBy`
  - [ ] `createdAt`

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

- [ ] `GET /inventory` — list inventory items.
- [ ] `GET /inventory/:productId` — get product stock detail.
- [ ] `POST /inventory/adjust` — manual stock adjustment.
- [ ] `POST /inventory/reserve` — reserve stock during checkout.
- [ ] `POST /inventory/release` — release reserved stock.
- [ ] `POST /inventory/confirm` — confirm reserved stock after payment.

### Reservation Transaction

- [ ] Start database transaction.
- [ ] Lock inventory row with `SELECT ... FOR UPDATE`.
- [ ] Check available stock.
- [ ] Create reservation.
- [ ] Increase reserved stock.
- [ ] Commit transaction.
- [ ] Rollback on error.

### Rules

- [ ] POS can use physical stock.
- [ ] Website must respect safety buffer.
- [ ] Social checkout must respect safety buffer.
- [ ] Checkout creates temporary reservation.
- [ ] Payment success confirms reservation.
- [ ] Payment timeout releases reservation.
- [ ] Refund may return stock depending on merchant setting.
- [ ] Inventory adjustment must create movement history.

### Worker

- [ ] Create reservation expiry worker.
- [ ] Find expired active reservations.
- [ ] Release reserved stock.
- [ ] Mark reservation as expired.
- [ ] Update checkout session as expired.
- [ ] Create inventory movement record.

---

## 6. Storefront Module

### APIs

- [ ] `GET /storefront/:merchantSlug` — get public storefront data.
- [ ] `GET /storefront/:merchantSlug/products` — get public products.
- [ ] `GET /storefront/:merchantSlug/products/:slug` — get public product detail.
- [ ] `GET /storefront/:merchantSlug/theme` — get live theme config.

### Rules

- [ ] Only live theme config is used by public storefront.
- [ ] Draft config must never affect live storefront.
- [ ] Products must be filtered by channel visibility.
- [ ] Products must be filtered by stock availability.
- [ ] Public storefront should use Redis cache where possible.

---

## 7. Theme Builder Module

### Database

- [ ] Create `merchant_themes` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `liveConfig`
  - [ ] `draftConfig`
  - [ ] `customDomain`
  - [ ] `publishedAt`
  - [ ] `createdAt`
  - [ ] `updatedAt`

### APIs

- [ ] `GET /themes/current` — get current draft and live theme.
- [ ] `PATCH /themes/draft` — save draft theme config.
- [ ] `POST /themes/preview` — generate preview theme response.
- [ ] `POST /themes/publish` — copy draft config to live config.
- [ ] `POST /themes/reset` — reset draft config to default.

### Rules

- [ ] Merchant can safely edit draft.
- [ ] Publish copies draft config to live config.
- [ ] Publishing theme must invalidate storefront cache.
- [ ] Theme config should be JSON-schema validated.
- [ ] Only authorized users can publish theme.

---

## 8. Checkout Module

### Database

- [ ] Create `checkout_sessions` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `customerId`
  - [ ] `sourceChannel`
  - [ ] `status`
  - [ ] `expiresAt`
  - [ ] `createdAt`
  - [ ] `updatedAt`

### APIs

- [ ] `POST /checkout/session` — create checkout session.
- [ ] `GET /checkout/session/:id` — get checkout session detail.
- [ ] `POST /checkout/session/:id/confirm` — confirm checkout before payment.
- [ ] `POST /checkout/session/:id/cancel` — cancel checkout and release reservation.

### Rules

- [ ] Checkout creates stock reservation.
- [ ] Checkout session must expire.
- [ ] Expired session must release reservation.
- [ ] Customer cannot pay expired checkout session.
- [ ] Checkout source channel must be stored.

---

## 9. Order Module

### Database

- [ ] Create `orders` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `customerId`
  - [ ] `sourceChannel`
  - [ ] `orderNumber`
  - [ ] `subtotalAmount`
  - [ ] `discountAmount`
  - [ ] `feeAmount`
  - [ ] `totalAmount`
  - [ ] `currency`
  - [ ] `paymentStatus`
  - [ ] `fulfillmentStatus`
  - [ ] `createdAt`
  - [ ] `updatedAt`

- [ ] Create `order_items` table.
  - [ ] `id`
  - [ ] `orderId`
  - [ ] `productId`
  - [ ] `variantId`
  - [ ] `sku`
  - [ ] `name`
  - [ ] `quantity`
  - [ ] `unitPrice`
  - [ ] `totalPrice`

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

- [ ] `GET /orders` — list orders.
- [ ] `GET /orders/:id` — get order detail.
- [ ] `PATCH /orders/:id/status` — update fulfillment status.
- [ ] `POST /orders/:id/cancel` — cancel order.
- [ ] `POST /orders/:id/refund` — refund order.

### Rules

- [ ] Prevent invalid order status transitions.
- [ ] Allow merchant to mark order as processing.
- [ ] Allow merchant to mark order as fulfilled.
- [ ] Allow merchant to cancel unpaid order.
- [ ] Prevent cancelling paid order without refund flow.
- [ ] Refund must write audit log.
- [ ] Refund may return stock depending on merchant setting.

---

## 10. Payment Module

### Database

- [ ] Create `payment_providers` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `provider`
  - [ ] `config`
  - [ ] `status`
  - [ ] `createdAt`
  - [ ] `updatedAt`

- [ ] Create `payments` table.
  - [ ] `id`
  - [ ] `merchantId`
  - [ ] `orderId`
  - [ ] `provider`
  - [ ] `providerTransactionId`
  - [ ] `amount`
  - [ ] `currency`
  - [ ] `status`
  - [ ] `paidAt`
  - [ ] `createdAt`

- [ ] Create `payment_webhook_events` table.
  - [ ] `id`
  - [ ] `provider`
  - [ ] `eventId`
  - [ ] `payload`
  - [ ] `status`
  - [ ] `processedAt`
  - [ ] `createdAt`

### APIs

- [ ] `POST /payments/providers` — connect payment provider.
- [ ] `GET /payments/providers` — list merchant payment providers.
- [ ] `POST /payments/create-intent` — create payment transaction.
- [ ] `POST /payments/webhook/:provider` — receive provider webhook.
- [ ] `GET /payments/:id` — get payment detail.

### Webhook Logic

- [ ] Verify provider webhook signature.
- [ ] Store webhook event before processing.
- [ ] Check duplicate provider event ID.
- [ ] Process payment idempotently.
- [ ] Mark payment as confirmed.
- [ ] Mark order as paid.
- [ ] Confirm inventory reservation.
- [ ] Create inventory movement.
- [ ] Push merchant notification.
- [ ] Write audit log.

### Rules

- [ ] Webhook must be idempotent.
- [ ] Provider transaction ID must be unique.
- [ ] Duplicate webhook must not double-deduct stock.
- [ ] Failed webhook must be logged.
- [ ] Payment confirmation must be transactional with order update.

---

## 11. Social Commerce Module

### Database

- [ ] Create `social_posts` table.
- [ ] Create `shoppable_hotspots` table.
- [ ] Create `social_post_publish_logs` table.

### APIs

- [ ] `POST /social-posts` — create social post draft.
- [ ] `GET /social-posts` — list social posts.
- [ ] `GET /social-posts/:id` — get social post detail.
- [ ] `PATCH /social-posts/:id` — update social post draft.
- [ ] `POST /social-posts/:id/hotspots` — add product hotspot.
- [ ] `POST /social-posts/:id/publish` — publish to selected platforms.
- [ ] `GET /social-posts/:id/logs` — view publish logs.

### Rules

- [ ] Social post stores links to products, not copied product data.
- [ ] Hotspots must reference active product or variant.
- [ ] Old social links must always check live stock availability.
- [ ] Publish failures must be logged by platform.
- [ ] Website blog/news post should be created when publishing to website.

---

## 12. Notification Module

- [ ] Create `notifications` table.
- [ ] Send notification for new order.
- [ ] Send notification for confirmed payment.
- [ ] Send notification for low stock.
- [ ] Send notification for out-of-stock product.
- [ ] Send notification for published social post.
- [ ] Send notification for failed payment webhook.
- [ ] Add WebSocket support for dashboard.

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

- [ ] Cache public storefront theme config.
  - Key: `merchant:{merchantId}:theme:live`
- [ ] Cache public product listing.
  - Key: `merchant:{merchantId}:products:public`
- [ ] Cache merchant dashboard summary.
  - Key: `merchant:{merchantId}:dashboard`
- [ ] Invalidate product cache when product changes.
- [ ] Invalidate product cache when stock changes.
- [ ] Invalidate theme cache when theme is published.
- [ ] Invalidate product cache when visibility changes.

---

## 14. Backend Testing

- [ ] Unit test product service.
- [ ] Unit test inventory calculation.
- [ ] Unit test reservation service.
- [ ] Unit test payment webhook idempotency.
- [ ] Unit test order status transition.
- [ ] Unit test permission guard.
- [ ] Unit test merchant scope guard.
- [ ] Integration test checkout flow.
- [ ] Integration test payment success flow.
- [ ] Integration test reservation expiry worker.
- [ ] Integration test theme publish flow.
- [ ] E2E test customer purchase flow.
- [ ] E2E test stock reservation race condition.
- [ ] E2E test duplicate webhook.

---

## 15. Backend Definition of Done

A backend task is done when:

- [ ] Database migration is added.
- [ ] DTO validation is added.
- [ ] Service logic is implemented.
- [ ] Controller endpoint is implemented.
- [ ] Permission check is added.
- [ ] Merchant scope check is added.
- [ ] Error handling is added.
- [ ] Audit log is added where needed.
- [ ] Unit or integration test is added.
- [ ] API works in staging.
