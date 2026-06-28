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
One merchant dashboard
One product catalog
One inventory source of truth
Multiple selling channels
One order engine
Multiple payment providers
One fulfillment flow
```

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

- [ ] Register merchant owner.
- [ ] Login.
- [ ] Refresh token.
- [ ] Logout.
- [ ] Current user profile.
- [ ] Merchant context.
- [ ] Default roles.
- [ ] Default permissions.
- [ ] JWT guard.
- [ ] Merchant scope guard.
- [ ] Permission guard.
- [ ] Dashboard protected layout.
- [ ] Frontend login page.
- [ ] Frontend register page.
- [ ] Frontend auth store.

### Sprint 2: Staff & Authorization

- [ ] Invite staff.
- [ ] Accept invitation.
- [ ] Staff list.
- [ ] Role assignment.
- [ ] Permission matrix.
- [ ] Frontend permission helper.
- [ ] Hide restricted UI actions.
- [ ] Audit logs.

### Sprint 3: Catalog & Inventory

- [ ] Product CRUD APIs.
- [ ] Product dashboard pages.
- [ ] Inventory tables.
- [ ] Stock adjustment.
- [ ] Channel visibility.
- [ ] Inventory movement history.
- [ ] Permission checks for product and inventory APIs.

### Sprint 4: Storefront

- [ ] Public storefront API.
- [ ] Storefront renderer.
- [ ] Product detail page.
- [ ] Basic theme config.
- [ ] Redis cache for storefront.
- [ ] Product availability on storefront.

### Sprint 5: Checkout & Order

- [ ] Checkout session.
- [ ] Inventory reservation.
- [ ] Order creation.
- [ ] Payment intent.
- [ ] Checkout frontend.
- [ ] Order success page.
- [ ] Order list page.
- [ ] Order detail page.

### Sprint 6: Payment & Webhook

- [ ] Payment provider config.
- [ ] Webhook verification.
- [ ] Payment confirmation.
- [ ] Order paid flow.
- [ ] Inventory confirmation.
- [ ] Merchant notification.
- [ ] Payment webhook idempotency.

### Sprint 7: Theme Builder

- [ ] Draft theme config.
- [ ] Live theme config.
- [ ] Theme editor UI.
- [ ] Preview mode.
- [ ] Publish flow.
- [ ] Theme cache invalidation.

### Sprint 8: Social Commerce

- [ ] Social post composer.
- [ ] Media upload.
- [ ] Product hotspot editor.
- [ ] Publish logs.
- [ ] Website blog post integration.
- [ ] Social checkout link routing.

### Sprint 9: Real-Time & Notifications

- [ ] WebSocket connection.
- [ ] New order notification.
- [ ] Payment confirmed notification.
- [ ] Low stock notification.
- [ ] Out-of-stock notification.
- [ ] Social post published notification.

### Sprint 10: Polish, Security & Testing

- [ ] E2E checkout test.
- [ ] Payment webhook test.
- [ ] Inventory race condition test.
- [ ] Merchant scope test.
- [ ] Permission guard test.
- [ ] Dashboard UX polish.
- [ ] Error handling.
- [ ] Deployment preparation.

---

## 5. Backend MVP Checklist

- [ ] Auth module.
- [ ] User module.
- [ ] Role module.
- [ ] Permission module.
- [ ] Merchant module.
- [ ] Merchant user module.
- [ ] Product module.
- [ ] Inventory module.
- [ ] Order module.
- [ ] Checkout module.
- [ ] Payment webhook module.
- [ ] Theme live config module.
- [ ] Public storefront APIs.
- [ ] Redis cache.
- [ ] Notification module.
- [ ] Audit log module.

---

## 6. Frontend MVP Checklist

- [ ] Auth pages.
- [ ] Protected dashboard layout.
- [ ] Merchant switcher.
- [ ] Permission helper.
- [ ] Dashboard overview.
- [ ] Product CRUD.
- [ ] Inventory page.
- [ ] Stock adjustment modal.
- [ ] Simple theme settings.
- [ ] Public storefront.
- [ ] Product detail page.
- [ ] Checkout page.
- [ ] Order success page.
- [ ] Order list page.
- [ ] Order detail page.

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
