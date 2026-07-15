# Merchant Commerce Hub — Frontend Technical TODO

## Purpose

This document lists frontend implementation tasks for the Merchant Commerce Hub dashboard, public storefront, checkout, theme builder, social commerce, and real-time merchant experience.

For the planned move from the current monolithic `dashboard/` frontend to independently deployable micro-frontends, see `dashboard/docs/improvment.md`.

---

## 1. Frontend Foundation

- [x] Set up Next.js App Router.
- [x] Set up TypeScript.
- [x] Set up Tailwind CSS.
- [x] Set up HeroUI.
- [x] Set up TanStack Query.
- [x] Set up Zustand or Redux Toolkit.
- [x] Set up Zod validation.
- [x] Set up ESLint and Prettier.
- [x] Set up environment variables.

### Route Groups

```txt
/app
  /(auth)
  /(dashboard)
  /(storefront)
```

### Shared Utilities

- [x] Create API client.
- [x] Create auth token helper.
- [x] Create error handler.
- [x] Create currency formatter.
- [x] Create date formatter.
- [x] Create form validation helper.
- [x] Create query key factory.
- [x] Create toast helper.

> Foundation implementation lives in `dashboard/config/`, `dashboard/lib/`, and
> `dashboard/stores/`. The root provider composes TanStack Query, theme, and
> HeroUI toast providers, while the three App Router groups establish boundaries
> for later auth, dashboard, and storefront layouts.

---

## 2. Dashboard Layout

- [x] Create dashboard protected layout.
- [x] Create sidebar navigation.
- [x] Create top navigation.
- [x] Create merchant switcher.
- [x] Create user profile menu.
- [x] Create notification dropdown.
- [x] Create responsive mobile menu.
- [x] Add page loading state.
- [x] Add route-level error state.

> `/dashboard` is wrapped by a client-side session boundary that redirects missing
> or expired bearer sessions to `/auth/login`. Navigation is filtered by the active
> merchant's permissions. Merchant switching rotates the access token and refreshes
> query state; notifications use the live inbox, unread, and read APIs.

---

## 3. Auth Pages

- [x] Create login page: `/auth/login`.
- [x] Create merchant registration page: `/auth/register`.
- [x] Create forgot password page: `/auth/forgot-password`.
- [x] Create reset password page: `/auth/reset-password`.
- [x] Create accept invitation page: `/auth/invite`.

> Login and registration are connected to the backend. Forgot password, reset
> password, and invitation acceptance include complete validated UI and pending
> integration notices because the corresponding backend endpoints do not exist yet.

---

## 4. Dashboard Home

Route:

```txt
/dashboard
```

Tasks:

- [x] Create dashboard overview page.
- [x] Add total revenue card.
- [x] Add total orders card.
- [x] Add pending orders card.
- [x] Add low stock card.
- [x] Add recent orders table.
- [x] Add sales chart.
- [x] Add stock alert section.
- [x] Add loading skeleton.
- [x] Add empty state.
- [x] Add error state.

> Dashboard metrics are calculated from complete paginated order and inventory
> data, including paid revenue and a seven-day sales trend.

---

## 5. Product Management

### Product List Page

Route:

```txt
/dashboard/products
```

- [x] Create product list page.
- [x] Add search.
- [x] Add filter by status.
- [x] Add filter by channel.
- [x] Add stock indicator.
- [x] Add bulk action.
- [x] Add create product button.
- [x] Add pagination.
- [x] Add permission-based action visibility.

### Product Create Page

Route:

```txt
/dashboard/products/new
```

- [x] Create product create page.
- [x] Add basic information form.
- [x] Add price field.
- [x] Add SKU field.
- [x] Add variant editor.
- [x] Add image uploader.
- [x] Add channel visibility selector.
- [x] Add safety buffer input.
- [x] Add form validation.
- [x] Add submit success toast.
- [x] Add submit error handling.

### Product Edit Page

Route:

```txt
/dashboard/products/[id]/edit
```

- [x] Create product edit page.
- [x] Edit product detail.
- [x] Edit variants.
- [x] Edit stock.
- [x] Edit channel visibility.
- [x] Show unsaved changes warning.
- [x] Add permission check.

### Product Detail Page

Route:

```txt
/dashboard/products/[id]
```

- [x] Create product detail page.
- [x] Show product summary.
- [x] Show stock movement history.
- [x] Show sales history.
- [x] Show channel visibility.
- [x] Show product media.
- [x] Add edit button if allowed.

> Product media uses hosted image/video URLs because the backend has no binary
> media upload endpoint. Channel filtering is composed from product detail data
> because the product list API does not expose a channel query parameter.

---

## 6. Inventory Management

### Inventory List Page

Route:

```txt
/dashboard/inventory
```

- [x] Create inventory list page.
- [x] Show product.
- [x] Show SKU.
- [x] Show total stock.
- [x] Show reserved stock.
- [x] Show sold stock.
- [x] Show safety buffer.
- [x] Show online sellable stock.
- [x] Show low stock warning.
- [x] Add search and filter.

### Stock Adjustment

- [x] Create stock adjustment modal.
- [x] Add adjustment type.
- [x] Add quantity field.
- [x] Add adjustment reason.
- [x] Add validation.
- [x] Add confirmation dialog.
- [x] Add success toast.
- [x] Update inventory table after success.

### Stock Movement History

Route:

```txt
/dashboard/inventory/movements
```

- [x] Create stock movement history page.
- [x] Add filters by product.
- [x] Add filters by movement type.
- [x] Add date range filter.
- [x] Add movement timeline.

### Low Stock Alert Page

Route:

```txt
/dashboard/inventory/alerts
```

- [x] Create low stock alert page.
- [x] Show products below threshold.
- [x] Show out-of-stock products.
- [x] Add quick stock adjustment action.

> Movement history is aggregated from the backend's per-product inventory
> detail endpoint because no merchant-wide movement endpoint exists.

---

## 7. Theme Builder

Route:

```txt
/dashboard/storefront/theme
```

- [x] Create theme designer page.
- [x] Add theme selector.
- [x] Add color token panel.
- [x] Add font selector.
- [x] Add border radius selector.
- [x] Add spacing selector.
- [x] Add section list.
- [x] Add preview panel.
- [x] Add mobile preview mode.
- [x] Add desktop preview mode.
- [x] Create draggable section editor.
- [x] Add hero banner section.
- [x] Add product grid section.
- [x] Add featured collection section.
- [x] Add social feed section.
- [x] Add contact form section.
- [x] Add footer section.
- [x] Add draft save button.
- [x] Add publish button.
- [x] Add reset button.
- [x] Add live preview mode.
- [x] Add unsaved changes warning.
- [x] Add permission check for publish.

---

## 8. Storefront Settings

Route:

```txt
/dashboard/storefront/settings
```

- [x] Create storefront settings page.
- [x] Add store name field.
- [x] Add store slug field.
- [x] Add custom domain field.
- [x] Add SEO title field.
- [x] Add SEO description field.
- [x] Add logo uploader.
- [x] Add favicon uploader.
- [x] Add save button.
- [x] Add validation.
- [x] Add success toast.

> Logo, favicon, and hero media use publicly hosted URLs because binary media
> storage is not configured. Theme section order, design tokens, SEO, and asset
> URLs are persisted in the validated theme configuration.

---

## 9. Order Management

### Order List Page

Route:

```txt
/dashboard/orders
```

- [x] Create order list page.
- [x] Add search by order number.
- [x] Add filter by payment status.
- [x] Add filter by fulfillment status.
- [x] Add filter by source channel.
- [x] Add date range filter.
- [x] Add order status badge.
- [x] Add pagination.

### Order Detail Page

Route:

```txt
/dashboard/orders/[id]
```

- [x] Create order detail page.
- [x] Show customer info.
- [x] Show ordered items.
- [x] Show payment info.
- [x] Show fulfillment status.
- [x] Show order timeline.
- [x] Show order notes.
- [x] Add action buttons.

### Order Actions

- [x] Add mark as processing button.
- [x] Add mark as fulfilled button.
- [x] Add cancel order button.
- [x] Add refund order button.
- [x] Add confirmation dialogs.
- [x] Add permission checks.
- [x] Add success and error toast.

---

## 10. Payment Management

### Provider Settings

Route:

```txt
/dashboard/payments/providers
```

- [x] Create payment provider settings page.
- [x] Add Stripe connection card.
- [x] Add PayPal connection card.
- [x] Add regional QR payment card.
- [x] Add manual bank transfer card.
- [x] Add provider status badge.
- [x] Add connect/disconnect action.
- [x] Add permission check.

### Transactions

Route:

```txt
/dashboard/payments/transactions
```

- [x] Create payment transaction list page.
- [x] Add transaction table.
- [x] Add provider filter.
- [x] Add status filter.
- [x] Add date filter.
- [x] Add order link.

### Payment Detail

Route:

```txt
/dashboard/payments/transactions/[id]
```

- [x] Create payment detail page.
- [x] Show provider transaction ID.
- [x] Show amount.
- [x] Show status.
- [x] Show related order.
- [x] Show webhook logs if allowed.

> The HMAC webhook gateway is the currently supported provider adapter. Stripe,
> PayPal, regional QR, and manual bank transfer are represented as clearly labeled
> planned cards until their backend adapters and credential flows are implemented.

---

## 11. Social Commerce

### Social Post List

Route:

```txt
/dashboard/social-posts
```

- [x] Create social post list page.
- [x] Show draft posts.
- [x] Show published posts.
- [x] Show failed posts.
- [x] Add platform filters.
- [x] Add publish status badge.

### Social Post Composer

Route:

```txt
/dashboard/social-posts/new
```

- [x] Create social post composer page.
- [x] Add content editor.
- [x] Add media upload.
- [x] Add platform selector.
- [x] Add product hotspot editor.
- [x] Add preview per platform.
- [x] Add save draft button.
- [x] Add publish button.

### Social Post Detail

Route:

```txt
/dashboard/social-posts/[id]
```

- [x] Create social post detail page.
- [x] Show post content.
- [x] Show media.
- [x] Show hotspots.
- [x] Show publish logs.
- [x] Show external platform links.

> The composer attaches hosted media, builds active-product/variant hotspots, and
> previews all supported platform layouts before saving or publishing. The list is
> server-filtered and paginated; detail views expose per-platform outcomes and live
> external links. External adapters continue to fail closed until credentials are
> configured, while website publishing creates the canonical storefront article.

---

## 12. Public Storefront

### Storefront Home

Route:

```txt
/store/[merchantSlug]
```

- [x] Create merchant storefront route.
- [x] Load live theme config.
- [x] Load public products.
- [x] Render dynamic sections from theme config.
- [x] Apply theme tokens dynamically.
- [x] Show product availability.
- [x] Hide unavailable products if configured.
- [x] Add storefront loading state.
- [x] Add storefront error page.

### Product Detail

Route:

```txt
/store/[merchantSlug]/products/[productSlug]
```

- [x] Create product detail page.
- [x] Show product images.
- [x] Show variants.
- [x] Show price.
- [x] Show stock status.
- [x] Show quantity selector.
- [x] Show buy button.
- [x] Disable buy button when out of stock.
- [x] Show social sharing links.

> Store routes render the published section order, brand tokens, typography,
> spacing, radius, SEO, catalog, and social content. Public catalog responses enforce
> lifecycle, channel visibility, purchasability, safety-buffer, and live-stock rules;
> unavailable products are therefore omitted before rendering. Buy-now revalidates
> price and reserves inventory through the checkout API.

---

## 13. Checkout Frontend

### Checkout Page

Route:

```txt
/checkout/[sessionId]
```

- [x] Create checkout page.
- [x] Show checkout items.
- [x] Show price summary.
- [x] Show payment methods.
- [x] Show expiration countdown.
- [x] Handle expired session.
- [x] Confirm payment.
- [x] Redirect to success page.
- [x] Add payment error state.

### Order Success Page

Route:

```txt
/checkout/[sessionId]/success
```

- [x] Create success page.
- [x] Show order number.
- [x] Show payment status.
- [x] Show receipt summary.
- [x] Show continue shopping button.

> The one-time checkout secret stays in tab-scoped session storage and is never
> placed in the URL. Confirmation idempotently creates the order and HMAC payment
> intent; the receipt distinguishes an order confirmation from the provider's
> webhook-driven final payment confirmation.

---

## 14. Shared Components

### Common

- [x] `DataTable`
- [x] `StatusBadge`
- [x] `MoneyText`
- [x] `DateTimeText`
- [x] `ConfirmDialog`
- [x] `EmptyState`
- [x] `LoadingState`
- [x] `ErrorState`
- [x] `FileUploader`
- [x] `ImageGallery`
- [x] `SearchInput`
- [x] `FilterDropdown`
- [x] `Pagination`

### Product

- [x] `ProductForm`
- [x] `ProductCard`
- [x] `ProductVariantEditor`
- [x] `ProductImageUploader`
- [x] `ChannelVisibilitySelector`
- [x] `SafetyBufferInput`
- [x] `StockStatusBadge`

### Inventory

- [x] `InventoryTable`
- [x] `StockAdjustmentModal`
- [x] `StockMovementTimeline`
- [x] `LowStockWarning`

### Theme Builder

- [x] `ThemeTokenPanel`
- [x] `SectionEditor`
- [x] `SectionSortableList`
- [x] `StorefrontPreview`
- [x] `DevicePreviewToggle`
- [x] `PublishThemeButton`

### Social Commerce

- [x] `SocialPostComposer`
- [x] `PlatformSelector`
- [x] `MediaUploader`
- [x] `HotspotEditor`
- [x] `HotspotProductSearch`
- [x] `PlatformPreviewCard`

### Order

- [x] `OrderTable`
- [x] `OrderTimeline`
- [x] `OrderItemList`
- [x] `OrderStatusActions`
- [x] `PaymentSummaryCard`

> Shared primitives now own table structure, status/date/money display, feedback
> states, confirmation, media selection, filters, and pagination. Feature-level
> composites expose controlled props so Product, Inventory, Theme, Social, and Order
> workflows can reuse them without coupling UI state to API calls.

---

## 15. Frontend API Hooks

- [x] `useProducts`
- [x] `useProduct`
- [x] `useCreateProduct`
- [x] `useUpdateProduct`
- [x] `useDeleteProduct`
- [x] `useUpdateProductChannelVisibility`
- [x] `useInventory`
- [x] `useInventoryItem`
- [x] `useAdjustStock`
- [x] `useStockMovements`
- [x] `useThemeConfig`
- [x] `useSaveDraftTheme`
- [x] `usePublishTheme`
- [x] `useResetTheme`
- [x] `useStorefront`
- [x] `useStorefrontProducts`
- [x] `useStorefrontProduct`
- [x] `useCheckoutSession`
- [x] `useOrders`
- [x] `useOrder`
- [x] `useUpdateOrderStatus`
- [x] `useCancelOrder`
- [x] `useRefundOrder`
- [x] `usePaymentProviders`
- [x] `useCreatePaymentIntent`
- [x] `usePayments`
- [x] `usePayment`
- [x] `useSocialPosts`
- [x] `useSocialPost`
- [x] `useCreateSocialPost`
- [x] `useUpdateSocialPost`
- [x] `usePublishSocialPost`
- [x] `useAddHotspot`

> Hooks use centralized query keys, permission-aware enablement, detail cache writes,
> and domain-level invalidation after mutations. Public storefront and checkout hooks
> preserve unauthenticated request semantics, while checkout secrets remain explicit
> hook inputs rather than URL state.

---

## 16. UX Tasks

- [x] Add loading skeletons for all pages.
- [x] Add empty states for all tables.
- [x] Add clear error messages.
- [x] Add success toast after create/update/delete.
- [x] Add confirmation dialog before destructive actions.
- [x] Add optimistic update for simple status changes.
- [x] Add form validation using Zod.
- [x] Add responsive layout for mobile dashboard.
- [x] Add keyboard accessible controls.
- [x] Add preview before publishing theme.
- [x] Add warning when unsaved theme changes exist.
- [x] Add countdown timer for checkout reservation expiry.
- [x] Add 403 permission error UI.
- [x] Add 401 session expired redirect.

> Notification read state updates optimistically with cache rollback. Destructive
> product/theme actions use native accessible dialogs, section ordering has keyboard
> controls, and forms use shared Zod validation. Authenticated 401 responses clear the
> tab-scoped session and trigger the login redirect; unexpected 403 responses render a
> dedicated permission state.

---

## 17. Real-Time Frontend Tasks

- [x] Connect dashboard to WebSocket.
- [x] Listen for order events.
- [x] Listen for payment events.
- [x] Listen for inventory events.
- [x] Show toast when new order arrives.
- [x] Update order table automatically.
- [x] Update inventory stock automatically.
- [x] Show low-stock warning in real time.

> The authenticated dashboard connects to the merchant-scoped `/notifications`
> namespace and reconnects when its token or active merchant changes. One typed event
> envelope drives permission-aware toasts, targeted query invalidation, immediate
> inventory cache patches, notification refreshes, and a visible connection status.

---

## 18. Frontend Definition of Done

A frontend task is done when:

- [x] Page or component is implemented.
- [x] API hook is connected.
- [x] Loading state is handled.
- [x] Empty state is handled.
- [x] Error state is handled.
- [x] Form validation is added.
- [x] Permission visibility is handled.
- [x] Success and failure messages are shown.
- [x] Responsive design is checked.
- [ ] Feature works in staging.

> Local implementation and verification satisfy every repository-controlled
> definition-of-done criterion. Staging remains intentionally unchecked because no
> staging dashboard/API URLs or deployment credentials are configured in this
> workspace; it requires an external deployment smoke test.
