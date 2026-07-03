# Merchant Commerce Hub — Frontend Technical TODO

## Purpose

This document lists frontend implementation tasks for the Merchant Commerce Hub dashboard, public storefront, checkout, theme builder, social commerce, and real-time merchant experience.

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

> Foundation implementation lives in `config/`, `lib/`, and `stores/`. The root
> provider composes TanStack Query, theme, and HeroUI toast providers, while the
> three App Router groups establish boundaries for later auth, dashboard, and
> storefront layouts.

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

- [ ] Create social post list page.
- [ ] Show draft posts.
- [ ] Show published posts.
- [ ] Show failed posts.
- [ ] Add platform filters.
- [ ] Add publish status badge.

### Social Post Composer

Route:

```txt
/dashboard/social-posts/new
```

- [ ] Create social post composer page.
- [ ] Add content editor.
- [ ] Add media upload.
- [ ] Add platform selector.
- [ ] Add product hotspot editor.
- [ ] Add preview per platform.
- [ ] Add save draft button.
- [ ] Add publish button.

### Social Post Detail

Route:

```txt
/dashboard/social-posts/[id]
```

- [ ] Create social post detail page.
- [ ] Show post content.
- [ ] Show media.
- [ ] Show hotspots.
- [ ] Show publish logs.
- [ ] Show external platform links.

---

## 12. Public Storefront

### Storefront Home

Route:

```txt
/store/[merchantSlug]
```

- [ ] Create merchant storefront route.
- [ ] Load live theme config.
- [ ] Load public products.
- [ ] Render dynamic sections from theme config.
- [ ] Apply theme tokens dynamically.
- [ ] Show product availability.
- [ ] Hide unavailable products if configured.
- [ ] Add storefront loading state.
- [ ] Add storefront error page.

### Product Detail

Route:

```txt
/store/[merchantSlug]/products/[productSlug]
```

- [ ] Create product detail page.
- [ ] Show product images.
- [ ] Show variants.
- [ ] Show price.
- [ ] Show stock status.
- [ ] Show quantity selector.
- [ ] Show buy button.
- [ ] Disable buy button when out of stock.
- [ ] Show social sharing links.

---

## 13. Checkout Frontend

### Checkout Page

Route:

```txt
/checkout/[sessionId]
```

- [ ] Create checkout page.
- [ ] Show checkout items.
- [ ] Show price summary.
- [ ] Show payment methods.
- [ ] Show expiration countdown.
- [ ] Handle expired session.
- [ ] Confirm payment.
- [ ] Redirect to success page.
- [ ] Add payment error state.

### Order Success Page

Route:

```txt
/checkout/[sessionId]/success
```

- [ ] Create success page.
- [ ] Show order number.
- [ ] Show payment status.
- [ ] Show receipt summary.
- [ ] Show continue shopping button.

---

## 14. Shared Components

### Common

- [ ] `DataTable`
- [ ] `StatusBadge`
- [ ] `MoneyText`
- [ ] `DateTimeText`
- [ ] `ConfirmDialog`
- [ ] `EmptyState`
- [ ] `LoadingState`
- [ ] `ErrorState`
- [ ] `FileUploader`
- [ ] `ImageGallery`
- [ ] `SearchInput`
- [ ] `FilterDropdown`
- [ ] `Pagination`

### Product

- [ ] `ProductForm`
- [ ] `ProductCard`
- [ ] `ProductVariantEditor`
- [ ] `ProductImageUploader`
- [ ] `ChannelVisibilitySelector`
- [ ] `SafetyBufferInput`
- [ ] `StockStatusBadge`

### Inventory

- [ ] `InventoryTable`
- [ ] `StockAdjustmentModal`
- [ ] `StockMovementTimeline`
- [ ] `LowStockWarning`

### Theme Builder

- [ ] `ThemeTokenPanel`
- [ ] `SectionEditor`
- [ ] `SectionSortableList`
- [ ] `StorefrontPreview`
- [ ] `DevicePreviewToggle`
- [ ] `PublishThemeButton`

### Social Commerce

- [ ] `SocialPostComposer`
- [ ] `PlatformSelector`
- [ ] `MediaUploader`
- [ ] `HotspotEditor`
- [ ] `HotspotProductSearch`
- [ ] `PlatformPreviewCard`

### Order

- [ ] `OrderTable`
- [ ] `OrderTimeline`
- [ ] `OrderItemList`
- [ ] `OrderStatusActions`
- [ ] `PaymentSummaryCard`

---

## 15. Frontend API Hooks

- [ ] `useProducts`
- [ ] `useProduct`
- [ ] `useCreateProduct`
- [ ] `useUpdateProduct`
- [ ] `useDeleteProduct`
- [ ] `useUpdateProductChannelVisibility`
- [ ] `useInventory`
- [ ] `useInventoryItem`
- [ ] `useAdjustStock`
- [ ] `useStockMovements`
- [ ] `useThemeConfig`
- [ ] `useSaveDraftTheme`
- [ ] `usePublishTheme`
- [ ] `useResetTheme`
- [ ] `useStorefront`
- [ ] `useStorefrontProducts`
- [ ] `useStorefrontProduct`
- [ ] `useCheckoutSession`
- [ ] `useOrders`
- [ ] `useOrder`
- [ ] `useUpdateOrderStatus`
- [ ] `useCancelOrder`
- [ ] `useRefundOrder`
- [ ] `usePaymentProviders`
- [ ] `useCreatePaymentIntent`
- [ ] `usePayments`
- [ ] `usePayment`
- [ ] `useSocialPosts`
- [ ] `useSocialPost`
- [ ] `useCreateSocialPost`
- [ ] `useUpdateSocialPost`
- [ ] `usePublishSocialPost`
- [ ] `useAddHotspot`

---

## 16. UX Tasks

- [ ] Add loading skeletons for all pages.
- [ ] Add empty states for all tables.
- [ ] Add clear error messages.
- [ ] Add success toast after create/update/delete.
- [ ] Add confirmation dialog before destructive actions.
- [ ] Add optimistic update for simple status changes.
- [ ] Add form validation using Zod.
- [ ] Add responsive layout for mobile dashboard.
- [ ] Add keyboard accessible controls.
- [ ] Add preview before publishing theme.
- [ ] Add warning when unsaved theme changes exist.
- [ ] Add countdown timer for checkout reservation expiry.
- [ ] Add 403 permission error UI.
- [ ] Add 401 session expired redirect.

---

## 17. Real-Time Frontend Tasks

- [ ] Connect dashboard to WebSocket.
- [ ] Listen for order events.
- [ ] Listen for payment events.
- [ ] Listen for inventory events.
- [ ] Show toast when new order arrives.
- [ ] Update order table automatically.
- [ ] Update inventory stock automatically.
- [ ] Show low-stock warning in real time.

---

## 18. Frontend Definition of Done

A frontend task is done when:

- [ ] Page or component is implemented.
- [ ] API hook is connected.
- [ ] Loading state is handled.
- [ ] Empty state is handled.
- [ ] Error state is handled.
- [ ] Form validation is added.
- [ ] Permission visibility is handled.
- [ ] Success and failure messages are shown.
- [ ] Responsive design is checked.
- [ ] Feature works in staging.
