# Merchant Commerce Hub — Master Technical Roadmap

## 1. Product Goal

Build a merchant commerce hub that allows one merchant to manage:

- Product catalog
- Real-time inventory
- Custom website storefront
- Social selling
- Checkout
- Payment
- Order fulfillment
- Staff permissions
- Merchant notifications

The platform must use one source of truth for product, stock, order, and payment state.

---

## 2. Core System Principle

```txt
One merchant admin app
One POS app
One public storefront app
One product catalog
One inventory source of truth
Multiple selling channels
One order engine
Multiple payment providers
One fulfillment flow
```

The frontend is now split into independently deployable apps under
`client/apps/*`. The old monolithic `client/dashboard/` frontend is archived and
removed from the active workspace.

---

## 3. Main Business Flow

```txt
Merchant registers
        ↓
Merchant creates products
        ↓
Merchant configures stock
        ↓
Merchant enables product channels
        ↓
Customer discovers product from website/social/POS
        ↓
Customer starts checkout
        ↓
System reserves stock
        ↓
Customer pays
        ↓
Payment webhook confirms payment
        ↓
Order becomes paid
        ↓
Inventory reservation becomes sold
        ↓
Merchant receives notification
        ↓
Merchant fulfills order
```

---

## 4. Sprint Plan

### Sprint 1: Authentication & Merchant Foundation

- [x] Register merchant owner.
- [x] Login.
- [x] Refresh token.
- [x] Logout.
- [x] Current user profile.
- [x] Merchant context.
- [x] Default roles.
- [x] Default permissions.
- [x] JWT guard.
- [x] Merchant scope guard.
- [x] Permission guard.
- [x] Dashboard protected layout.
- [x] Frontend login page.
- [x] Frontend register page.
- [x] Frontend auth store.

### Sprint 2: Staff & Authorization

- [ ] Invite staff.
- [ ] Accept invitation.
- [ ] Staff list.
- [ ] Role assignment.
- [ ] Permission matrix.
- [x] Frontend permission helper.
- [x] Hide restricted UI actions.
- [ ] Audit logs.

### Sprint 3: Catalog & Inventory

- [x] Product CRUD APIs.
- [x] Product dashboard pages.
- [x] Inventory tables.
- [x] Stock adjustment.
- [x] Channel visibility.
- [x] Inventory movement history.
- [x] Permission checks for product and inventory APIs.

### Sprint 4: Storefront

- [x] Public storefront API.
- [ ] Storefront renderer.
- [ ] Product detail page.
- [x] Basic theme config.
- [x] Redis cache for storefront.
- [x] Product availability on storefront.

### Sprint 5: Checkout & Order

- [x] Checkout session.
- [x] Inventory reservation.
- [x] Order creation.
- [x] Payment intent.
- [ ] Checkout frontend.
- [ ] Order success page.
- [x] Order list page.
- [x] Order detail page.

### Sprint 6: Payment & Webhook

- [x] Payment provider config.
- [x] Webhook verification.
- [x] Payment confirmation.
- [x] Order paid flow.
- [x] Inventory confirmation.
- [x] Merchant notification.
- [x] Payment webhook idempotency.

### Sprint 7: Theme Builder

- [x] Draft theme config.
- [x] Live theme config.
- [ ] Theme editor UI.
- [x] Preview mode.
- [x] Publish flow.
- [x] Theme cache invalidation.

### Sprint 8: Social Commerce

- [x] Social post composer.
- [ ] Media upload.
- [ ] Product hotspot editor.
- [x] Publish logs.
- [x] Website blog post integration.
- [x] Social checkout link routing.

### Sprint 9: Real-Time & Notifications

- [x] WebSocket connection.
- [x] New order notification.
- [x] Payment confirmed notification.
- [x] Low stock notification.
- [x] Out-of-stock notification.
- [x] Social post published notification.

### Sprint 10: Polish, Security & Testing

- [ ] E2E checkout test.
- [ ] Payment webhook test.
- [x] Inventory race condition test.
- [x] Merchant scope test.
- [x] Permission guard test.
- [x] Merchant dashboard UX polish.
- [x] Error handling.
- [x] Deployment preparation.

---

## 5. Backend MVP Checklist

- [ ] Auth module.
- [ ] User module.
- [ ] Role module.
- [ ] Permission module.
- [x] Merchant module.
- [ ] Merchant user module.
- [x] Product module.
- [x] Inventory module.
- [x] Order module.
- [x] Checkout module.
- [x] Payment webhook module.
- [x] Theme live config module.
- [x] Public storefront APIs.
- [x] Redis cache.
- [x] Notification module.
- [ ] Audit log module.

---

## 6. Frontend MVP Checklist

- [x] Auth pages.
- [x] Protected dashboard layout.
- [x] Merchant switcher.
- [x] Permission helper.
- [x] Dashboard overview.
- [x] Product CRUD.
- [x] Inventory page.
- [x] Stock adjustment modal.
- [x] Simple theme settings.
- [x] Public storefront.
- [x] Product detail page.
- [x] Checkout page.
- [x] Order success page.
- [x] Order list page.
- [x] Order detail page.
- [x] POS app.

---

## 7. Recommended Backend Module Order

```txt
1. Auth
2. Merchant
3. Role & Permission
4. Product Catalog
5. Inventory
6. Storefront
7. Checkout
8. Order
9. Payment
10. Notification
11. Theme Builder
12. Social Commerce
```

---

## 8. Recommended Frontend Page Order

```txt
1. Login
2. Register Merchant
3. Protected Dashboard Layout
4. Merchant Switcher
5. Dashboard Home
6. Product List
7. Product Create/Edit
8. Inventory
9. Storefront Public Page
10. Product Detail
11. Checkout
12. Order List
13. Order Detail
14. Theme Builder
15. Social Post Composer
```

---

## 8.1 Active Frontend Architecture

| Surface | App | Public base path |
|---------|-----|------------------|
| Merchant admin | `client/apps/merchant` | `/merchant` |
| POS | `client/apps/pos` | `/pos` |
| Storefront | `client/apps/storefront` | `/` |

Shared UI, type, API, auth, and query helpers live in `client/packages/*`. The
legacy `client/dashboard/` app is archived for reference only and must not
receive new production routes.

---

## 9. Critical Technical Rules

### Authentication

```txt
Every private dashboard API requires JWT authentication.
```

### Authorization

```txt
Every sensitive action requires permission check.
```

### Merchant Isolation

```txt
Every merchant resource must be filtered by merchantId.
```

### Inventory

```txt
All selling channels must use the same stock engine.
```

### Reservation

```txt
Checkout must reserve stock before payment.
```

### Payment

```txt
Payment webhook must be verified and idempotent.
```

### Theme

```txt
Draft config must not affect live storefront until publish.
```

### Social Commerce

```txt
Social posts must link to product/SKU, not copy product stock data.
```

### Cache

```txt
Public storefront should read from Redis cache where possible.
```

---

## 10. Definition of Done

A feature is done when:

- [ ] Backend API is implemented.
- [ ] Database migration is added.
- [ ] DTO validation is added.
- [ ] Error handling is added.
- [ ] Permission check is added.
- [ ] Merchant scope check is added.
- [ ] Audit log is added where needed.
- [ ] Unit or integration test is added.
- [ ] Frontend UI is implemented.
- [ ] Frontend API hook is connected.
- [ ] Loading state is handled.
- [ ] Empty state is handled.
- [ ] Error state is handled.
- [ ] Success and failure messages are shown.
- [ ] Responsive design is checked.
- [ ] Feature works in staging.
