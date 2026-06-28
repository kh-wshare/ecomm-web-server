# Merchant Commerce Hub — Frontend Technical TODO

## Purpose

This document lists frontend implementation tasks for the Merchant Commerce Hub dashboard, public storefront, checkout, theme builder, social commerce, and real-time merchant experience.

---

## 1. Frontend Foundation

- [ ] Set up Next.js App Router.
- [ ] Set up TypeScript.
- [ ] Set up Tailwind CSS.
- [ ] Set up HeroUI.
- [ ] Set up TanStack Query.
- [ ] Set up Zustand or Redux Toolkit.
- [ ] Set up Zod validation.
- [ ] Set up ESLint and Prettier.
- [ ] Set up environment variables.

### Route Groups

```txt
/app
  /(auth)
  /(dashboard)
  /(storefront)
```

### Shared Utilities

- [ ] Create API client.
- [ ] Create auth token helper.
- [ ] Create error handler.
- [ ] Create currency formatter.
- [ ] Create date formatter.
- [ ] Create form validation helper.
- [ ] Create query key factory.
- [ ] Create toast helper.

---

## 2. Dashboard Layout

- [ ] Create dashboard protected layout.
- [ ] Create sidebar navigation.
- [ ] Create top navigation.
- [ ] Create merchant switcher.
- [ ] Create user profile menu.
- [ ] Create notification dropdown.
- [ ] Create responsive mobile menu.
- [ ] Add page loading state.
- [ ] Add route-level error state.

---

## 3. Auth Pages

- [ ] Create login page: `/auth/login`.
- [ ] Create merchant registration page: `/auth/register`.
- [ ] Create forgot password page: `/auth/forgot-password`.
- [ ] Create reset password page: `/auth/reset-password`.
- [ ] Create accept invitation page: `/auth/invite`.

---

## 4. Dashboard Home

Route:

```txt
/dashboard
```

Tasks:

- [ ] Create dashboard overview page.
- [ ] Add total revenue card.
- [ ] Add total orders card.
- [ ] Add pending orders card.
- [ ] Add low stock card.
- [ ] Add recent orders table.
- [ ] Add sales chart.
- [ ] Add stock alert section.
- [ ] Add loading skeleton.
- [ ] Add empty state.
- [ ] Add error state.

---

## 5. Product Management

### Product List Page

Route:

```txt
/dashboard/products
```

- [ ] Create product list page.
- [ ] Add search.
- [ ] Add filter by status.
- [ ] Add filter by channel.
- [ ] Add stock indicator.
- [ ] Add bulk action.
- [ ] Add create product button.
- [ ] Add pagination.
- [ ] Add permission-based action visibility.

### Product Create Page

Route:

```txt
/dashboard/products/new
```

- [ ] Create product create page.
- [ ] Add basic information form.
- [ ] Add price field.
- [ ] Add SKU field.
- [ ] Add variant editor.
- [ ] Add image uploader.
- [ ] Add channel visibility selector.
- [ ] Add safety buffer input.
- [ ] Add form validation.
- [ ] Add submit success toast.
- [ ] Add submit error handling.

### Product Edit Page

Route:

```txt
/dashboard/products/[id]/edit
```

- [ ] Create product edit page.
- [ ] Edit product detail.
- [ ] Edit variants.
- [ ] Edit stock.
- [ ] Edit channel visibility.
- [ ] Show unsaved changes warning.
- [ ] Add permission check.

### Product Detail Page

Route:

```txt
/dashboard/products/[id]
```

- [ ] Create product detail page.
- [ ] Show product summary.
- [ ] Show stock movement history.
- [ ] Show sales history.
- [ ] Show channel visibility.
- [ ] Show product media.
- [ ] Add edit button if allowed.

---

## 6. Inventory Management

### Inventory List Page

Route:

```txt
/dashboard/inventory
```

- [ ] Create inventory list page.
- [ ] Show product.
- [ ] Show SKU.
- [ ] Show total stock.
- [ ] Show reserved stock.
- [ ] Show sold stock.
- [ ] Show safety buffer.
- [ ] Show online sellable stock.
- [ ] Show low stock warning.
- [ ] Add search and filter.

### Stock Adjustment

- [ ] Create stock adjustment modal.
- [ ] Add adjustment type.
- [ ] Add quantity field.
- [ ] Add adjustment reason.
- [ ] Add validation.
- [ ] Add confirmation dialog.
- [ ] Add success toast.
- [ ] Update inventory table after success.

### Stock Movement History

Route:

```txt
/dashboard/inventory/movements
```

- [ ] Create stock movement history page.
- [ ] Add filters by product.
- [ ] Add filters by movement type.
- [ ] Add date range filter.
- [ ] Add movement timeline.

### Low Stock Alert Page

Route:

```txt
/dashboard/inventory/alerts
```

- [ ] Create low stock alert page.
- [ ] Show products below threshold.
- [ ] Show out-of-stock products.
- [ ] Add quick stock adjustment action.

---

## 7. Theme Builder

Route:

```txt
/dashboard/storefront/theme
```

- [ ] Create theme designer page.
- [ ] Add theme selector.
- [ ] Add color token panel.
- [ ] Add font selector.
- [ ] Add border radius selector.
- [ ] Add spacing selector.
- [ ] Add section list.
- [ ] Add preview panel.
- [ ] Add mobile preview mode.
- [ ] Add desktop preview mode.
- [ ] Create draggable section editor.
- [ ] Add hero banner section.
- [ ] Add product grid section.
- [ ] Add featured collection section.
- [ ] Add social feed section.
- [ ] Add contact form section.
- [ ] Add footer section.
- [ ] Add draft save button.
- [ ] Add publish button.
- [ ] Add reset button.
- [ ] Add live preview mode.
- [ ] Add unsaved changes warning.
- [ ] Add permission check for publish.

---

## 8. Storefront Settings

Route:

```txt
/dashboard/storefront/settings
```

- [ ] Create storefront settings page.
- [ ] Add store name field.
- [ ] Add store slug field.
- [ ] Add custom domain field.
- [ ] Add SEO title field.
- [ ] Add SEO description field.
- [ ] Add logo uploader.
- [ ] Add favicon uploader.
- [ ] Add save button.
- [ ] Add validation.
- [ ] Add success toast.

---

## 9. Order Management

### Order List Page

Route:

```txt
/dashboard/orders
```

- [ ] Create order list page.
- [ ] Add search by order number.
- [ ] Add filter by payment status.
- [ ] Add filter by fulfillment status.
- [ ] Add filter by source channel.
- [ ] Add date range filter.
- [ ] Add order status badge.
- [ ] Add pagination.

### Order Detail Page

Route:

```txt
/dashboard/orders/[id]
```

- [ ] Create order detail page.
- [ ] Show customer info.
- [ ] Show ordered items.
- [ ] Show payment info.
- [ ] Show fulfillment status.
- [ ] Show order timeline.
- [ ] Show order notes.
- [ ] Add action buttons.

### Order Actions

- [ ] Add mark as processing button.
- [ ] Add mark as fulfilled button.
- [ ] Add cancel order button.
- [ ] Add refund order button.
- [ ] Add confirmation dialogs.
- [ ] Add permission checks.
- [ ] Add success and error toast.

---

## 10. Payment Management

### Provider Settings

Route:

```txt
/dashboard/payments/providers
```

- [ ] Create payment provider settings page.
- [ ] Add Stripe connection card.
- [ ] Add PayPal connection card.
- [ ] Add regional QR payment card.
- [ ] Add manual bank transfer card.
- [ ] Add provider status badge.
- [ ] Add connect/disconnect action.
- [ ] Add permission check.

### Transactions

Route:

```txt
/dashboard/payments/transactions
```

- [ ] Create payment transaction list page.
- [ ] Add transaction table.
- [ ] Add provider filter.
- [ ] Add status filter.
- [ ] Add date filter.
- [ ] Add order link.

### Payment Detail

Route:

```txt
/dashboard/payments/transactions/[id]
```

- [ ] Create payment detail page.
- [ ] Show provider transaction ID.
- [ ] Show amount.
- [ ] Show status.
- [ ] Show related order.
- [ ] Show webhook logs if allowed.

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
