-- Rename all camelCase columns to snake_case.
-- RENAME COLUMN preserves data, indexes, PKs and FKs (names fixed up below).

ALTER TABLE "users" RENAME COLUMN "fullName" TO "full_name";
ALTER TABLE "users" RENAME COLUMN "telegramId" TO "telegram_id";
ALTER TABLE "users" RENAME COLUMN "passwordHash" TO "password_hash";
ALTER TABLE "users" RENAME COLUMN "platformRole" TO "platform_role";
ALTER TABLE "users" RENAME COLUMN "mustChangePassword" TO "must_change_password";
ALTER TABLE "users" RENAME COLUMN "lastLoginAt" TO "last_login_at";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "users" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "auth_identities" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "auth_identities" RENAME COLUMN "providerUserId" TO "provider_user_id";
ALTER TABLE "auth_identities" RENAME COLUMN "telegramId" TO "telegram_id";
ALTER TABLE "auth_identities" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "auth_identities" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "merchants" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchants" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "merchants" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "merchants" RENAME COLUMN "returnStockOnRefund" TO "return_stock_on_refund";
ALTER TABLE "merchant_branches" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "merchant_branches" RENAME COLUMN "addressLine1" TO "address_line1";
ALTER TABLE "merchant_branches" RENAME COLUMN "addressLine2" TO "address_line2";
ALTER TABLE "merchant_branches" RENAME COLUMN "postalCode" TO "postal_code";
ALTER TABLE "merchant_branches" RENAME COLUMN "registerName" TO "register_name";
ALTER TABLE "merchant_branches" RENAME COLUMN "isDefault" TO "is_default";
ALTER TABLE "merchant_branches" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_branches" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "merchant_branches" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "products" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "products" RENAME COLUMN "categoryId" TO "category_id";
ALTER TABLE "products" RENAME COLUMN "inventoryType" TO "inventory_type";
ALTER TABLE "products" RENAME COLUMN "trackStock" TO "track_stock";
ALTER TABLE "products" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "products" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "products" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "product_categories" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "product_categories" RENAME COLUMN "logoUrl" TO "logo_url";
ALTER TABLE "product_categories" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE "product_categories" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_categories" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "product_categories" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "merchant_themes" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "merchant_themes" RENAME COLUMN "liveConfig" TO "live_config";
ALTER TABLE "merchant_themes" RENAME COLUMN "draftConfig" TO "draft_config";
ALTER TABLE "merchant_themes" RENAME COLUMN "customDomain" TO "custom_domain";
ALTER TABLE "merchant_themes" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "merchant_themes" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_themes" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "product_variants" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "product_variants" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "product_variants" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_variants" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "product_media" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "product_media" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE "product_media" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_channel_visibility" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "product_channel_visibility" RENAME COLUMN "isVisible" TO "is_visible";
ALTER TABLE "product_channel_visibility" RENAME COLUMN "isPurchasable" TO "is_purchasable";
ALTER TABLE "product_channel_visibility" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_channel_visibility" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "inventory_stocks" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "inventory_stocks" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "inventory_stocks" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE "inventory_stocks" RENAME COLUMN "stockKey" TO "stock_key";
ALTER TABLE "inventory_stocks" RENAME COLUMN "totalStock" TO "total_stock";
ALTER TABLE "inventory_stocks" RENAME COLUMN "reservedStock" TO "reserved_stock";
ALTER TABLE "inventory_stocks" RENAME COLUMN "soldStock" TO "sold_stock";
ALTER TABLE "inventory_stocks" RENAME COLUMN "safetyBuffer" TO "safety_buffer";
ALTER TABLE "inventory_stocks" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "inventory_stocks" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "inventory_reservations" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "inventory_reservations" RENAME COLUMN "inventoryStockId" TO "inventory_stock_id";
ALTER TABLE "inventory_reservations" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "inventory_reservations" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE "inventory_reservations" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "inventory_reservations" RENAME COLUMN "checkoutSessionId" TO "checkout_session_id";
ALTER TABLE "inventory_reservations" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "inventory_reservations" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "inventory_reservations" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "checkout_sessions" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "checkout_sessions" RENAME COLUMN "branchId" TO "branch_id";
ALTER TABLE "checkout_sessions" RENAME COLUMN "posDeviceId" TO "pos_device_id";
ALTER TABLE "checkout_sessions" RENAME COLUMN "customerId" TO "customer_id";
ALTER TABLE "checkout_sessions" RENAME COLUMN "customerName" TO "customer_name";
ALTER TABLE "checkout_sessions" RENAME COLUMN "customerEmail" TO "customer_email";
ALTER TABLE "checkout_sessions" RENAME COLUMN "customerPhone" TO "customer_phone";
ALTER TABLE "checkout_sessions" RENAME COLUMN "sourceChannel" TO "source_channel";
ALTER TABLE "checkout_sessions" RENAME COLUMN "accessTokenHash" TO "access_token_hash";
ALTER TABLE "checkout_sessions" RENAME COLUMN "subtotalAmount" TO "subtotal_amount";
ALTER TABLE "checkout_sessions" RENAME COLUMN "discountAmount" TO "discount_amount";
ALTER TABLE "checkout_sessions" RENAME COLUMN "feeAmount" TO "fee_amount";
ALTER TABLE "checkout_sessions" RENAME COLUMN "shippingAmount" TO "shipping_amount";
ALTER TABLE "checkout_sessions" RENAME COLUMN "totalAmount" TO "total_amount";
ALTER TABLE "checkout_sessions" RENAME COLUMN "deliveryMethodId" TO "delivery_method_id";
ALTER TABLE "checkout_sessions" RENAME COLUMN "deliveryMethodName" TO "delivery_method_name";
ALTER TABLE "checkout_sessions" RENAME COLUMN "shippingAddress" TO "shipping_address";
ALTER TABLE "checkout_sessions" RENAME COLUMN "billingAddress" TO "billing_address";
ALTER TABLE "checkout_sessions" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "checkout_sessions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "checkout_sessions" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "checkout_items" RENAME COLUMN "checkoutSessionId" TO "checkout_session_id";
ALTER TABLE "checkout_items" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "checkout_items" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE "checkout_items" RENAME COLUMN "unitPrice" TO "unit_price";
ALTER TABLE "checkout_items" RENAME COLUMN "totalPrice" TO "total_price";
ALTER TABLE "checkout_items" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "orders" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "orders" RENAME COLUMN "checkoutSessionId" TO "checkout_session_id";
ALTER TABLE "orders" RENAME COLUMN "branchId" TO "branch_id";
ALTER TABLE "orders" RENAME COLUMN "posDeviceId" TO "pos_device_id";
ALTER TABLE "orders" RENAME COLUMN "posShiftId" TO "pos_shift_id";
ALTER TABLE "orders" RENAME COLUMN "tableId" TO "table_id";
ALTER TABLE "orders" RENAME COLUMN "localId" TO "local_id";
ALTER TABLE "orders" RENAME COLUMN "customerId" TO "customer_id";
ALTER TABLE "orders" RENAME COLUMN "customerName" TO "customer_name";
ALTER TABLE "orders" RENAME COLUMN "customerEmail" TO "customer_email";
ALTER TABLE "orders" RENAME COLUMN "customerPhone" TO "customer_phone";
ALTER TABLE "orders" RENAME COLUMN "sourceChannel" TO "source_channel";
ALTER TABLE "orders" RENAME COLUMN "orderNumber" TO "order_number";
ALTER TABLE "orders" RENAME COLUMN "subtotalAmount" TO "subtotal_amount";
ALTER TABLE "orders" RENAME COLUMN "discountAmount" TO "discount_amount";
ALTER TABLE "orders" RENAME COLUMN "feeAmount" TO "fee_amount";
ALTER TABLE "orders" RENAME COLUMN "shippingAmount" TO "shipping_amount";
ALTER TABLE "orders" RENAME COLUMN "totalAmount" TO "total_amount";
ALTER TABLE "orders" RENAME COLUMN "deliveryMethodId" TO "delivery_method_id";
ALTER TABLE "orders" RENAME COLUMN "deliveryMethodName" TO "delivery_method_name";
ALTER TABLE "orders" RENAME COLUMN "shippingAddress" TO "shipping_address";
ALTER TABLE "orders" RENAME COLUMN "billingAddress" TO "billing_address";
ALTER TABLE "orders" RENAME COLUMN "paymentStatus" TO "payment_status";
ALTER TABLE "orders" RENAME COLUMN "fulfillmentStatus" TO "fulfillment_status";
ALTER TABLE "orders" RENAME COLUMN "paidAt" TO "paid_at";
ALTER TABLE "orders" RENAME COLUMN "fulfilledAt" TO "fulfilled_at";
ALTER TABLE "orders" RENAME COLUMN "cancelledAt" TO "cancelled_at";
ALTER TABLE "orders" RENAME COLUMN "refundedAt" TO "refunded_at";
ALTER TABLE "orders" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "orders" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "order_items" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "order_items" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "order_items" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE "order_items" RENAME COLUMN "unitPrice" TO "unit_price";
ALTER TABLE "order_items" RENAME COLUMN "totalPrice" TO "total_price";
ALTER TABLE "order_items" RENAME COLUMN "sentToKitchenQuantity" TO "sent_to_kitchen_quantity";
ALTER TABLE "order_items" RENAME COLUMN "preparedQuantity" TO "prepared_quantity";
ALTER TABLE "order_items" RENAME COLUMN "cancelledQuantity" TO "cancelled_quantity";
ALTER TABLE "order_items" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "order_items" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "payment_providers" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "payment_providers" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "payment_providers" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "payments" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "payments" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "payments" RENAME COLUMN "posShiftId" TO "pos_shift_id";
ALTER TABLE "payments" RENAME COLUMN "paymentProviderId" TO "payment_provider_id";
ALTER TABLE "payments" RENAME COLUMN "providerTransactionId" TO "provider_transaction_id";
ALTER TABLE "payments" RENAME COLUMN "paymentReference" TO "payment_reference";
ALTER TABLE "payments" RENAME COLUMN "idempotencyKey" TO "idempotency_key";
ALTER TABLE "payments" RENAME COLUMN "paidAt" TO "paid_at";
ALTER TABLE "payments" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "payments" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "payment_webhook_events" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "payment_webhook_events" RENAME COLUMN "paymentProviderId" TO "payment_provider_id";
ALTER TABLE "payment_webhook_events" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE "payment_webhook_events" RENAME COLUMN "eventId" TO "event_id";
ALTER TABLE "payment_webhook_events" RENAME COLUMN "processedAt" TO "processed_at";
ALTER TABLE "payment_webhook_events" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "payment_refunds" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "payment_refunds" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE "payment_refunds" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "payment_refunds" RENAME COLUMN "providerRefundTransactionId" TO "provider_refund_transaction_id";
ALTER TABLE "payment_refunds" RENAME COLUMN "idempotencyKey" TO "idempotency_key";
ALTER TABLE "payment_refunds" RENAME COLUMN "returnedStock" TO "returned_stock";
ALTER TABLE "payment_refunds" RENAME COLUMN "requestedById" TO "requested_by_id";
ALTER TABLE "payment_refunds" RENAME COLUMN "approvedById" TO "approved_by_id";
ALTER TABLE "payment_refunds" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "payment_refunds" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "pos_devices" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "pos_devices" RENAME COLUMN "branchId" TO "branch_id";
ALTER TABLE "pos_devices" RENAME COLUMN "deviceId" TO "device_id";
ALTER TABLE "pos_devices" RENAME COLUMN "appVersion" TO "app_version";
ALTER TABLE "pos_devices" RENAME COLUMN "lastSeenAt" TO "last_seen_at";
ALTER TABLE "pos_devices" RENAME COLUMN "registeredById" TO "registered_by_id";
ALTER TABLE "pos_devices" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "pos_devices" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "pos_devices" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "pos_shifts" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "pos_shifts" RENAME COLUMN "branchId" TO "branch_id";
ALTER TABLE "pos_shifts" RENAME COLUMN "posDeviceId" TO "pos_device_id";
ALTER TABLE "pos_shifts" RENAME COLUMN "openedById" TO "opened_by_id";
ALTER TABLE "pos_shifts" RENAME COLUMN "closedById" TO "closed_by_id";
ALTER TABLE "pos_shifts" RENAME COLUMN "openingCash" TO "opening_cash";
ALTER TABLE "pos_shifts" RENAME COLUMN "closingCash" TO "closing_cash";
ALTER TABLE "pos_shifts" RENAME COLUMN "expectedCash" TO "expected_cash";
ALTER TABLE "pos_shifts" RENAME COLUMN "cashDifference" TO "cash_difference";
ALTER TABLE "pos_shifts" RENAME COLUMN "openedAt" TO "opened_at";
ALTER TABLE "pos_shifts" RENAME COLUMN "closedAt" TO "closed_at";
ALTER TABLE "pos_shifts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "pos_shifts" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "pos_tables" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "pos_tables" RENAME COLUMN "branchId" TO "branch_id";
ALTER TABLE "pos_tables" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "pos_tables" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "pos_tables" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "customers" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "customers" RENAME COLUMN "fullName" TO "full_name";
ALTER TABLE "customers" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "customers" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "customers" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "kitchen_orders" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "kitchen_orders" RENAME COLUMN "branchId" TO "branch_id";
ALTER TABLE "kitchen_orders" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "kitchen_orders" RENAME COLUMN "posShiftId" TO "pos_shift_id";
ALTER TABLE "kitchen_orders" RENAME COLUMN "tableId" TO "table_id";
ALTER TABLE "kitchen_orders" RENAME COLUMN "sentById" TO "sent_by_id";
ALTER TABLE "kitchen_orders" RENAME COLUMN "sentAt" TO "sent_at";
ALTER TABLE "kitchen_orders" RENAME COLUMN "acceptedAt" TO "accepted_at";
ALTER TABLE "kitchen_orders" RENAME COLUMN "readyAt" TO "ready_at";
ALTER TABLE "kitchen_orders" RENAME COLUMN "completedAt" TO "completed_at";
ALTER TABLE "kitchen_orders" RENAME COLUMN "idempotencyKey" TO "idempotency_key";
ALTER TABLE "kitchen_orders" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "kitchen_orders" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "kitchen_order_items" RENAME COLUMN "kitchenOrderId" TO "kitchen_order_id";
ALTER TABLE "kitchen_order_items" RENAME COLUMN "orderItemId" TO "order_item_id";
ALTER TABLE "kitchen_order_items" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "kitchen_order_items" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "outbox_events" RENAME COLUMN "aggregateType" TO "aggregate_type";
ALTER TABLE "outbox_events" RENAME COLUMN "aggregateId" TO "aggregate_id";
ALTER TABLE "outbox_events" RENAME COLUMN "eventType" TO "event_type";
ALTER TABLE "outbox_events" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "outbox_events" RENAME COLUMN "lastError" TO "last_error";
ALTER TABLE "outbox_events" RENAME COLUMN "availableAt" TO "available_at";
ALTER TABLE "outbox_events" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "outbox_events" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "idempotency_keys" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "idempotency_keys" RENAME COLUMN "requestHash" TO "request_hash";
ALTER TABLE "idempotency_keys" RENAME COLUMN "responseStatus" TO "response_status";
ALTER TABLE "idempotency_keys" RENAME COLUMN "responseBody" TO "response_body";
ALTER TABLE "idempotency_keys" RENAME COLUMN "entityType" TO "entity_type";
ALTER TABLE "idempotency_keys" RENAME COLUMN "entityId" TO "entity_id";
ALTER TABLE "idempotency_keys" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "idempotency_keys" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "idempotency_keys" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "notifications" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "notifications" RENAME COLUMN "dedupeKey" TO "dedupe_key";
ALTER TABLE "notifications" RENAME COLUMN "readAt" TO "read_at";
ALTER TABLE "notifications" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "social_posts" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "social_posts" RENAME COLUMN "mediaUrls" TO "media_urls";
ALTER TABLE "social_posts" RENAME COLUMN "targetPlatforms" TO "target_platforms";
ALTER TABLE "social_posts" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "social_posts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "social_posts" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "shoppable_hotspots" RENAME COLUMN "socialPostId" TO "social_post_id";
ALTER TABLE "shoppable_hotspots" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "shoppable_hotspots" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE "shoppable_hotspots" RENAME COLUMN "xPercent" TO "x_percent";
ALTER TABLE "shoppable_hotspots" RENAME COLUMN "yPercent" TO "y_percent";
ALTER TABLE "shoppable_hotspots" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "social_post_publish_logs" RENAME COLUMN "socialPostId" TO "social_post_id";
ALTER TABLE "social_post_publish_logs" RENAME COLUMN "externalPostId" TO "external_post_id";
ALTER TABLE "social_post_publish_logs" RENAME COLUMN "externalUrl" TO "external_url";
ALTER TABLE "social_post_publish_logs" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "website_articles" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "website_articles" RENAME COLUMN "socialPostId" TO "social_post_id";
ALTER TABLE "website_articles" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "website_articles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "website_articles" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "inventory_movements" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "inventory_movements" RENAME COLUMN "inventoryStockId" TO "inventory_stock_id";
ALTER TABLE "inventory_movements" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "inventory_movements" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE "inventory_movements" RENAME COLUMN "referenceId" TO "reference_id";
ALTER TABLE "inventory_movements" RENAME COLUMN "referenceType" TO "reference_type";
ALTER TABLE "inventory_movements" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "inventory_movements" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_users" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "merchant_users" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "merchant_users" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "merchant_users" RENAME COLUMN "invitedById" TO "invited_by_id";
ALTER TABLE "merchant_users" RENAME COLUMN "joinedAt" TO "joined_at";
ALTER TABLE "merchant_users" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_users" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "roles" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "roles" RENAME COLUMN "isSystemRole" TO "is_system_role";
ALTER TABLE "roles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "roles" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "role_permissions" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "role_permissions" RENAME COLUMN "permissionId" TO "permission_id";
ALTER TABLE "role_permissions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "sessions" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "sessions" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "sessions" RENAME COLUMN "refreshTokenHash" TO "refresh_token_hash";
ALTER TABLE "sessions" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "sessions" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "sessions" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "sessions" RENAME COLUMN "revokedAt" TO "revoked_at";
ALTER TABLE "sessions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "sessions" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "tokenHash" TO "token_hash";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "usedAt" TO "used_at";
ALTER TABLE "password_reset_tokens" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_invitations" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "merchant_invitations" RENAME COLUMN "roleId" TO "role_id";
ALTER TABLE "merchant_invitations" RENAME COLUMN "invitedById" TO "invited_by_id";
ALTER TABLE "merchant_invitations" RENAME COLUMN "tokenHash" TO "token_hash";
ALTER TABLE "merchant_invitations" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "merchant_invitations" RENAME COLUMN "acceptedAt" TO "accepted_at";
ALTER TABLE "merchant_invitations" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "audit_logs" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "audit_logs" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "audit_logs" RENAME COLUMN "entityType" TO "entity_type";
ALTER TABLE "audit_logs" RENAME COLUMN "entityId" TO "entity_id";
ALTER TABLE "audit_logs" RENAME COLUMN "ipAddress" TO "ip_address";
ALTER TABLE "audit_logs" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "audit_logs" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "carts" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "carts" RENAME COLUMN "customerId" TO "customer_id";
ALTER TABLE "carts" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "carts" RENAME COLUMN "checkoutSessionId" TO "checkout_session_id";
ALTER TABLE "carts" RENAME COLUMN "accessTokenHash" TO "access_token_hash";
ALTER TABLE "carts" RENAME COLUMN "sourceChannel" TO "source_channel";
ALTER TABLE "carts" RENAME COLUMN "customerName" TO "customer_name";
ALTER TABLE "carts" RENAME COLUMN "customerEmail" TO "customer_email";
ALTER TABLE "carts" RENAME COLUMN "customerPhone" TO "customer_phone";
ALTER TABLE "carts" RENAME COLUMN "shippingAddressId" TO "shipping_address_id";
ALTER TABLE "carts" RENAME COLUMN "billingAddressId" TO "billing_address_id";
ALTER TABLE "carts" RENAME COLUMN "deliveryMethodId" TO "delivery_method_id";
ALTER TABLE "carts" RENAME COLUMN "deliveryZoneId" TO "delivery_zone_id";
ALTER TABLE "carts" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "carts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "carts" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "cart_items" RENAME COLUMN "cartId" TO "cart_id";
ALTER TABLE "cart_items" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "cart_items" RENAME COLUMN "variantId" TO "variant_id";
ALTER TABLE "cart_items" RENAME COLUMN "lineKey" TO "line_key";
ALTER TABLE "cart_items" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "cart_items" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "customer_addresses" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "customer_addresses" RENAME COLUMN "customerId" TO "customer_id";
ALTER TABLE "customer_addresses" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "customer_addresses" RENAME COLUMN "recipientName" TO "recipient_name";
ALTER TABLE "customer_addresses" RENAME COLUMN "postalCode" TO "postal_code";
ALTER TABLE "customer_addresses" RENAME COLUMN "isDefaultShipping" TO "is_default_shipping";
ALTER TABLE "customer_addresses" RENAME COLUMN "isDefaultBilling" TO "is_default_billing";
ALTER TABLE "customer_addresses" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "customer_addresses" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "customer_addresses" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "delivery_methods" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "delivery_methods" RENAME COLUMN "branchId" TO "branch_id";
ALTER TABLE "delivery_methods" RENAME COLUMN "isDefault" TO "is_default";
ALTER TABLE "delivery_methods" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE "delivery_methods" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "delivery_methods" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "delivery_methods" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "delivery_zones" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "delivery_zones" RENAME COLUMN "deliveryMethodId" TO "delivery_method_id";
ALTER TABLE "delivery_zones" RENAME COLUMN "postalCodes" TO "postal_codes";
ALTER TABLE "delivery_zones" RENAME COLUMN "baseFee" TO "base_fee";
ALTER TABLE "delivery_zones" RENAME COLUMN "perItemFee" TO "per_item_fee";
ALTER TABLE "delivery_zones" RENAME COLUMN "freeOverSubtotal" TO "free_over_subtotal";
ALTER TABLE "delivery_zones" RENAME COLUMN "minSubtotal" TO "min_subtotal";
ALTER TABLE "delivery_zones" RENAME COLUMN "maxSubtotal" TO "max_subtotal";
ALTER TABLE "delivery_zones" RENAME COLUMN "estimatedMinDays" TO "estimated_min_days";
ALTER TABLE "delivery_zones" RENAME COLUMN "estimatedMaxDays" TO "estimated_max_days";
ALTER TABLE "delivery_zones" RENAME COLUMN "isFallback" TO "is_fallback";
ALTER TABLE "delivery_zones" RENAME COLUMN "sortOrder" TO "sort_order";
ALTER TABLE "delivery_zones" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "delivery_zones" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "delivery_zones" RENAME COLUMN "deletedAt" TO "deleted_at";
ALTER TABLE "shipments" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "shipments" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "shipments" RENAME COLUMN "deliveryMethodId" TO "delivery_method_id";
ALTER TABLE "shipments" RENAME COLUMN "shipmentNumber" TO "shipment_number";
ALTER TABLE "shipments" RENAME COLUMN "carrierName" TO "carrier_name";
ALTER TABLE "shipments" RENAME COLUMN "trackingNumber" TO "tracking_number";
ALTER TABLE "shipments" RENAME COLUMN "trackingUrl" TO "tracking_url";
ALTER TABLE "shipments" RENAME COLUMN "recipientName" TO "recipient_name";
ALTER TABLE "shipments" RENAME COLUMN "shippingCost" TO "shipping_cost";
ALTER TABLE "shipments" RENAME COLUMN "shippedAt" TO "shipped_at";
ALTER TABLE "shipments" RENAME COLUMN "deliveredAt" TO "delivered_at";
ALTER TABLE "shipments" RENAME COLUMN "cancelledAt" TO "cancelled_at";
ALTER TABLE "shipments" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "shipments" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "shipment_items" RENAME COLUMN "shipmentId" TO "shipment_id";
ALTER TABLE "shipment_items" RENAME COLUMN "orderItemId" TO "order_item_id";
ALTER TABLE "shipment_items" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "shipment_events" RENAME COLUMN "shipmentId" TO "shipment_id";
ALTER TABLE "shipment_events" RENAME COLUMN "occurredAt" TO "occurred_at";
ALTER TABLE "shipment_events" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "shipment_events" RENAME COLUMN "createdAt" TO "created_at";

-- Constraint and index names still carry the old column names; realign them
-- with Prisma's expected defaults.

-- RenameForeignKey
ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_logs_merchantId_fkey" TO "audit_logs_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "audit_logs" RENAME CONSTRAINT "audit_logs_userId_fkey" TO "audit_logs_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "auth_identities" RENAME CONSTRAINT "auth_identities_userId_fkey" TO "auth_identities_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "cart_items" RENAME CONSTRAINT "cart_items_cartId_fkey" TO "cart_items_cart_id_fkey";

-- RenameForeignKey
ALTER TABLE "cart_items" RENAME CONSTRAINT "cart_items_productId_fkey" TO "cart_items_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "cart_items" RENAME CONSTRAINT "cart_items_variantId_fkey" TO "cart_items_variant_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_billingAddressId_fkey" TO "carts_billing_address_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_checkoutSessionId_fkey" TO "carts_checkout_session_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_createdById_fkey" TO "carts_created_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_customerId_fkey" TO "carts_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_deliveryMethodId_fkey" TO "carts_delivery_method_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_deliveryZoneId_fkey" TO "carts_delivery_zone_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_merchantId_fkey" TO "carts_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "carts" RENAME CONSTRAINT "carts_shippingAddressId_fkey" TO "carts_shipping_address_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_items" RENAME CONSTRAINT "checkout_items_checkoutSessionId_fkey" TO "checkout_items_checkout_session_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_items" RENAME CONSTRAINT "checkout_items_productId_fkey" TO "checkout_items_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_items" RENAME CONSTRAINT "checkout_items_variantId_fkey" TO "checkout_items_variant_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_sessions" RENAME CONSTRAINT "checkout_sessions_branchId_fkey" TO "checkout_sessions_branch_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_sessions" RENAME CONSTRAINT "checkout_sessions_customerId_fkey" TO "checkout_sessions_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_sessions" RENAME CONSTRAINT "checkout_sessions_deliveryMethodId_fkey" TO "checkout_sessions_delivery_method_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_sessions" RENAME CONSTRAINT "checkout_sessions_merchantId_fkey" TO "checkout_sessions_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "checkout_sessions" RENAME CONSTRAINT "checkout_sessions_posDeviceId_fkey" TO "checkout_sessions_pos_device_id_fkey";

-- RenameForeignKey
ALTER TABLE "customer_addresses" RENAME CONSTRAINT "customer_addresses_createdById_fkey" TO "customer_addresses_created_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "customer_addresses" RENAME CONSTRAINT "customer_addresses_customerId_fkey" TO "customer_addresses_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "customer_addresses" RENAME CONSTRAINT "customer_addresses_merchantId_fkey" TO "customer_addresses_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "customers" RENAME CONSTRAINT "customers_merchantId_fkey" TO "customers_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "delivery_methods" RENAME CONSTRAINT "delivery_methods_branchId_fkey" TO "delivery_methods_branch_id_fkey";

-- RenameForeignKey
ALTER TABLE "delivery_methods" RENAME CONSTRAINT "delivery_methods_merchantId_fkey" TO "delivery_methods_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "delivery_zones" RENAME CONSTRAINT "delivery_zones_deliveryMethodId_fkey" TO "delivery_zones_delivery_method_id_fkey";

-- RenameForeignKey
ALTER TABLE "delivery_zones" RENAME CONSTRAINT "delivery_zones_merchantId_fkey" TO "delivery_zones_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "idempotency_keys" RENAME CONSTRAINT "idempotency_keys_merchantId_fkey" TO "idempotency_keys_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_movements" RENAME CONSTRAINT "inventory_movements_createdById_fkey" TO "inventory_movements_created_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_movements" RENAME CONSTRAINT "inventory_movements_inventoryStockId_fkey" TO "inventory_movements_inventory_stock_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_movements" RENAME CONSTRAINT "inventory_movements_merchantId_fkey" TO "inventory_movements_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_movements" RENAME CONSTRAINT "inventory_movements_productId_fkey" TO "inventory_movements_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_movements" RENAME CONSTRAINT "inventory_movements_variantId_fkey" TO "inventory_movements_variant_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_reservations" RENAME CONSTRAINT "inventory_reservations_inventoryStockId_fkey" TO "inventory_reservations_inventory_stock_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_reservations" RENAME CONSTRAINT "inventory_reservations_merchantId_fkey" TO "inventory_reservations_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_reservations" RENAME CONSTRAINT "inventory_reservations_productId_fkey" TO "inventory_reservations_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_reservations" RENAME CONSTRAINT "inventory_reservations_variantId_fkey" TO "inventory_reservations_variant_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_stocks" RENAME CONSTRAINT "inventory_stocks_merchantId_fkey" TO "inventory_stocks_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_stocks" RENAME CONSTRAINT "inventory_stocks_productId_fkey" TO "inventory_stocks_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "inventory_stocks" RENAME CONSTRAINT "inventory_stocks_variantId_fkey" TO "inventory_stocks_variant_id_fkey";

-- RenameForeignKey
ALTER TABLE "kitchen_order_items" RENAME CONSTRAINT "kitchen_order_items_kitchenOrderId_fkey" TO "kitchen_order_items_kitchen_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "kitchen_order_items" RENAME CONSTRAINT "kitchen_order_items_orderItemId_fkey" TO "kitchen_order_items_order_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "kitchen_orders" RENAME CONSTRAINT "kitchen_orders_merchantId_fkey" TO "kitchen_orders_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "kitchen_orders" RENAME CONSTRAINT "kitchen_orders_orderId_fkey" TO "kitchen_orders_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "kitchen_orders" RENAME CONSTRAINT "kitchen_orders_posShiftId_fkey" TO "kitchen_orders_pos_shift_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_branches" RENAME CONSTRAINT "merchant_branches_merchantId_fkey" TO "merchant_branches_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_invitations" RENAME CONSTRAINT "merchant_invitations_invitedById_fkey" TO "merchant_invitations_invited_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_invitations" RENAME CONSTRAINT "merchant_invitations_merchantId_fkey" TO "merchant_invitations_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_invitations" RENAME CONSTRAINT "merchant_invitations_roleId_fkey" TO "merchant_invitations_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_themes" RENAME CONSTRAINT "merchant_themes_merchantId_fkey" TO "merchant_themes_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_users" RENAME CONSTRAINT "merchant_users_invitedById_fkey" TO "merchant_users_invited_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_users" RENAME CONSTRAINT "merchant_users_merchantId_fkey" TO "merchant_users_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_users" RENAME CONSTRAINT "merchant_users_roleId_fkey" TO "merchant_users_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "merchant_users" RENAME CONSTRAINT "merchant_users_userId_fkey" TO "merchant_users_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "notifications" RENAME CONSTRAINT "notifications_merchantId_fkey" TO "notifications_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "order_items" RENAME CONSTRAINT "order_items_orderId_fkey" TO "order_items_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "order_items" RENAME CONSTRAINT "order_items_productId_fkey" TO "order_items_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "order_items" RENAME CONSTRAINT "order_items_variantId_fkey" TO "order_items_variant_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_branchId_fkey" TO "orders_branch_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_checkoutSessionId_fkey" TO "orders_checkout_session_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_customerId_fkey" TO "orders_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_deliveryMethodId_fkey" TO "orders_delivery_method_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_merchantId_fkey" TO "orders_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_posDeviceId_fkey" TO "orders_pos_device_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_posShiftId_fkey" TO "orders_pos_shift_id_fkey";

-- RenameForeignKey
ALTER TABLE "orders" RENAME CONSTRAINT "orders_tableId_fkey" TO "orders_table_id_fkey";

-- RenameForeignKey
ALTER TABLE "password_reset_tokens" RENAME CONSTRAINT "password_reset_tokens_userId_fkey" TO "password_reset_tokens_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_providers" RENAME CONSTRAINT "payment_providers_merchantId_fkey" TO "payment_providers_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_refunds" RENAME CONSTRAINT "payment_refunds_merchantId_fkey" TO "payment_refunds_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_refunds" RENAME CONSTRAINT "payment_refunds_paymentId_fkey" TO "payment_refunds_payment_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_webhook_events" RENAME CONSTRAINT "payment_webhook_events_merchantId_fkey" TO "payment_webhook_events_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_webhook_events" RENAME CONSTRAINT "payment_webhook_events_paymentId_fkey" TO "payment_webhook_events_payment_id_fkey";

-- RenameForeignKey
ALTER TABLE "payment_webhook_events" RENAME CONSTRAINT "payment_webhook_events_paymentProviderId_fkey" TO "payment_webhook_events_payment_provider_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_merchantId_fkey" TO "payments_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_orderId_fkey" TO "payments_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_paymentProviderId_fkey" TO "payments_payment_provider_id_fkey";

-- RenameForeignKey
ALTER TABLE "payments" RENAME CONSTRAINT "payments_posShiftId_fkey" TO "payments_pos_shift_id_fkey";

-- RenameForeignKey
ALTER TABLE "pos_devices" RENAME CONSTRAINT "pos_devices_branchId_fkey" TO "pos_devices_branch_id_fkey";

-- RenameForeignKey
ALTER TABLE "pos_devices" RENAME CONSTRAINT "pos_devices_merchantId_fkey" TO "pos_devices_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "pos_shifts" RENAME CONSTRAINT "pos_shifts_branchId_fkey" TO "pos_shifts_branch_id_fkey";

-- RenameForeignKey
ALTER TABLE "pos_shifts" RENAME CONSTRAINT "pos_shifts_merchantId_fkey" TO "pos_shifts_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "pos_shifts" RENAME CONSTRAINT "pos_shifts_posDeviceId_fkey" TO "pos_shifts_pos_device_id_fkey";

-- RenameForeignKey
ALTER TABLE "pos_tables" RENAME CONSTRAINT "pos_tables_branchId_fkey" TO "pos_tables_branch_id_fkey";

-- RenameForeignKey
ALTER TABLE "pos_tables" RENAME CONSTRAINT "pos_tables_merchantId_fkey" TO "pos_tables_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "product_categories" RENAME CONSTRAINT "product_categories_merchantId_fkey" TO "product_categories_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "product_channel_visibility" RENAME CONSTRAINT "product_channel_visibility_productId_fkey" TO "product_channel_visibility_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "product_media" RENAME CONSTRAINT "product_media_productId_fkey" TO "product_media_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "product_variants" RENAME CONSTRAINT "product_variants_productId_merchantId_fkey" TO "product_variants_product_id_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "products" RENAME CONSTRAINT "products_categoryId_fkey" TO "products_category_id_fkey";

-- RenameForeignKey
ALTER TABLE "products" RENAME CONSTRAINT "products_merchantId_fkey" TO "products_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "role_permissions" RENAME CONSTRAINT "role_permissions_permissionId_fkey" TO "role_permissions_permission_id_fkey";

-- RenameForeignKey
ALTER TABLE "role_permissions" RENAME CONSTRAINT "role_permissions_roleId_fkey" TO "role_permissions_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "roles" RENAME CONSTRAINT "roles_merchantId_fkey" TO "roles_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "sessions_merchantId_fkey" TO "sessions_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "sessions_userId_fkey" TO "sessions_user_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipment_events" RENAME CONSTRAINT "shipment_events_shipmentId_fkey" TO "shipment_events_shipment_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipment_items" RENAME CONSTRAINT "shipment_items_orderItemId_fkey" TO "shipment_items_order_item_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipment_items" RENAME CONSTRAINT "shipment_items_shipmentId_fkey" TO "shipment_items_shipment_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipments" RENAME CONSTRAINT "shipments_deliveryMethodId_fkey" TO "shipments_delivery_method_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipments" RENAME CONSTRAINT "shipments_merchantId_fkey" TO "shipments_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "shipments" RENAME CONSTRAINT "shipments_orderId_fkey" TO "shipments_order_id_fkey";

-- RenameForeignKey
ALTER TABLE "shoppable_hotspots" RENAME CONSTRAINT "shoppable_hotspots_productId_fkey" TO "shoppable_hotspots_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "shoppable_hotspots" RENAME CONSTRAINT "shoppable_hotspots_socialPostId_fkey" TO "shoppable_hotspots_social_post_id_fkey";

-- RenameForeignKey
ALTER TABLE "shoppable_hotspots" RENAME CONSTRAINT "shoppable_hotspots_variantId_fkey" TO "shoppable_hotspots_variant_id_fkey";

-- RenameForeignKey
ALTER TABLE "social_post_publish_logs" RENAME CONSTRAINT "social_post_publish_logs_socialPostId_fkey" TO "social_post_publish_logs_social_post_id_fkey";

-- RenameForeignKey
ALTER TABLE "social_posts" RENAME CONSTRAINT "social_posts_merchantId_fkey" TO "social_posts_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "website_articles" RENAME CONSTRAINT "website_articles_merchantId_fkey" TO "website_articles_merchant_id_fkey";

-- RenameForeignKey
ALTER TABLE "website_articles" RENAME CONSTRAINT "website_articles_socialPostId_fkey" TO "website_articles_social_post_id_fkey";

-- RenameIndex
ALTER INDEX "audit_logs_merchantId_createdAt_idx" RENAME TO "audit_logs_merchant_id_created_at_idx";

-- RenameIndex
ALTER INDEX "audit_logs_userId_createdAt_idx" RENAME TO "audit_logs_user_id_created_at_idx";

-- RenameIndex
ALTER INDEX "auth_identities_provider_providerUserId_key" RENAME TO "auth_identities_provider_provider_user_id_key";

-- RenameIndex
ALTER INDEX "auth_identities_telegramId_key" RENAME TO "auth_identities_telegram_id_key";

-- RenameIndex
ALTER INDEX "auth_identities_userId_idx" RENAME TO "auth_identities_user_id_idx";

-- RenameIndex
ALTER INDEX "cart_items_cartId_idx" RENAME TO "cart_items_cart_id_idx";

-- RenameIndex
ALTER INDEX "cart_items_cartId_lineKey_key" RENAME TO "cart_items_cart_id_line_key_key";

-- RenameIndex
ALTER INDEX "cart_items_productId_idx" RENAME TO "cart_items_product_id_idx";

-- RenameIndex
ALTER INDEX "cart_items_variantId_idx" RENAME TO "cart_items_variant_id_idx";

-- RenameIndex
ALTER INDEX "carts_accessTokenHash_key" RENAME TO "carts_access_token_hash_key";

-- RenameIndex
ALTER INDEX "carts_checkoutSessionId_key" RENAME TO "carts_checkout_session_id_key";

-- RenameIndex
ALTER INDEX "carts_createdById_createdAt_idx" RENAME TO "carts_created_by_id_created_at_idx";

-- RenameIndex
ALTER INDEX "carts_merchantId_customerId_idx" RENAME TO "carts_merchant_id_customer_id_idx";

-- RenameIndex
ALTER INDEX "carts_merchantId_status_expiresAt_idx" RENAME TO "carts_merchant_id_status_expires_at_idx";

-- RenameIndex
ALTER INDEX "checkout_items_checkoutSessionId_idx" RENAME TO "checkout_items_checkout_session_id_idx";

-- RenameIndex
ALTER INDEX "checkout_items_productId_idx" RENAME TO "checkout_items_product_id_idx";

-- RenameIndex
ALTER INDEX "checkout_items_variantId_idx" RENAME TO "checkout_items_variant_id_idx";

-- RenameIndex
ALTER INDEX "checkout_sessions_accessTokenHash_key" RENAME TO "checkout_sessions_access_token_hash_key";

-- RenameIndex
ALTER INDEX "checkout_sessions_branchId_idx" RENAME TO "checkout_sessions_branch_id_idx";

-- RenameIndex
ALTER INDEX "checkout_sessions_merchantId_status_expiresAt_idx" RENAME TO "checkout_sessions_merchant_id_status_expires_at_idx";

-- RenameIndex
ALTER INDEX "checkout_sessions_posDeviceId_idx" RENAME TO "checkout_sessions_pos_device_id_idx";

-- RenameIndex
ALTER INDEX "customer_addresses_createdById_createdAt_idx" RENAME TO "customer_addresses_created_by_id_created_at_idx";

-- RenameIndex
ALTER INDEX "customer_addresses_customerId_isDefaultShipping_idx" RENAME TO "customer_addresses_customer_id_is_default_shipping_idx";

-- RenameIndex
ALTER INDEX "customer_addresses_merchantId_customerId_deletedAt_idx" RENAME TO "customer_addresses_merchant_id_customer_id_deleted_at_idx";

-- RenameIndex
ALTER INDEX "customers_merchantId_email_idx" RENAME TO "customers_merchant_id_email_idx";

-- RenameIndex
ALTER INDEX "customers_merchantId_phone_idx" RENAME TO "customers_merchant_id_phone_idx";

-- RenameIndex
ALTER INDEX "delivery_methods_merchantId_code_key" RENAME TO "delivery_methods_merchant_id_code_key";

-- RenameIndex
ALTER INDEX "delivery_methods_merchantId_sortOrder_idx" RENAME TO "delivery_methods_merchant_id_sort_order_idx";

-- RenameIndex
ALTER INDEX "delivery_methods_merchantId_status_deletedAt_idx" RENAME TO "delivery_methods_merchant_id_status_deleted_at_idx";

-- RenameIndex
ALTER INDEX "delivery_zones_deliveryMethodId_deletedAt_sortOrder_idx" RENAME TO "delivery_zones_delivery_method_id_deleted_at_sort_order_idx";

-- RenameIndex
ALTER INDEX "delivery_zones_merchantId_idx" RENAME TO "delivery_zones_merchant_id_idx";

-- RenameIndex
ALTER INDEX "idempotency_keys_expiresAt_idx" RENAME TO "idempotency_keys_expires_at_idx";

-- RenameIndex
ALTER INDEX "idempotency_keys_merchantId_scope_key_key" RENAME TO "idempotency_keys_merchant_id_scope_key_key";

-- RenameIndex
ALTER INDEX "inventory_movements_inventoryStockId_createdAt_idx" RENAME TO "inventory_movements_inventory_stock_id_created_at_idx";

-- RenameIndex
ALTER INDEX "inventory_movements_merchantId_productId_createdAt_idx" RENAME TO "inventory_movements_merchant_id_product_id_created_at_idx";

-- RenameIndex
ALTER INDEX "inventory_reservations_checkoutSessionId_inventoryStockId_key" RENAME TO "inventory_reservations_checkout_session_id_inventory_stock__key";

-- RenameIndex
ALTER INDEX "inventory_reservations_merchantId_status_expiresAt_idx" RENAME TO "inventory_reservations_merchant_id_status_expires_at_idx";

-- RenameIndex
ALTER INDEX "inventory_reservations_orderId_idx" RENAME TO "inventory_reservations_order_id_idx";

-- RenameIndex
ALTER INDEX "inventory_stocks_merchantId_productId_idx" RENAME TO "inventory_stocks_merchant_id_product_id_idx";

-- RenameIndex
ALTER INDEX "inventory_stocks_merchantId_stockKey_key" RENAME TO "inventory_stocks_merchant_id_stock_key_key";

-- RenameIndex
ALTER INDEX "inventory_stocks_variantId_idx" RENAME TO "inventory_stocks_variant_id_idx";

-- RenameIndex
ALTER INDEX "kitchen_order_items_kitchenOrderId_idx" RENAME TO "kitchen_order_items_kitchen_order_id_idx";

-- RenameIndex
ALTER INDEX "kitchen_order_items_orderItemId_idx" RENAME TO "kitchen_order_items_order_item_id_idx";

-- RenameIndex
ALTER INDEX "kitchen_orders_idempotencyKey_key" RENAME TO "kitchen_orders_idempotency_key_key";

-- RenameIndex
ALTER INDEX "kitchen_orders_merchantId_branchId_status_createdAt_idx" RENAME TO "kitchen_orders_merchant_id_branch_id_status_created_at_idx";

-- RenameIndex
ALTER INDEX "kitchen_orders_orderId_idx" RENAME TO "kitchen_orders_order_id_idx";

-- RenameIndex
ALTER INDEX "merchant_branches_merchantId_code_key" RENAME TO "merchant_branches_merchant_id_code_key";

-- RenameIndex
ALTER INDEX "merchant_branches_merchantId_isDefault_idx" RENAME TO "merchant_branches_merchant_id_is_default_idx";

-- RenameIndex
ALTER INDEX "merchant_branches_merchantId_status_deletedAt_idx" RENAME TO "merchant_branches_merchant_id_status_deleted_at_idx";

-- RenameIndex
ALTER INDEX "merchant_invitations_merchantId_email_idx" RENAME TO "merchant_invitations_merchant_id_email_idx";

-- RenameIndex
ALTER INDEX "merchant_invitations_tokenHash_key" RENAME TO "merchant_invitations_token_hash_key";

-- RenameIndex
ALTER INDEX "merchant_themes_customDomain_key" RENAME TO "merchant_themes_custom_domain_key";

-- RenameIndex
ALTER INDEX "merchant_themes_merchantId_key" RENAME TO "merchant_themes_merchant_id_key";

-- RenameIndex
ALTER INDEX "merchant_users_merchantId_userId_key" RENAME TO "merchant_users_merchant_id_user_id_key";

-- RenameIndex
ALTER INDEX "merchant_users_roleId_idx" RENAME TO "merchant_users_role_id_idx";

-- RenameIndex
ALTER INDEX "merchant_users_userId_status_idx" RENAME TO "merchant_users_user_id_status_idx";

-- RenameIndex
ALTER INDEX "notifications_dedupeKey_key" RENAME TO "notifications_dedupe_key_key";

-- RenameIndex
ALTER INDEX "notifications_merchantId_readAt_createdAt_idx" RENAME TO "notifications_merchant_id_read_at_created_at_idx";

-- RenameIndex
ALTER INDEX "order_items_orderId_idx" RENAME TO "order_items_order_id_idx";

-- RenameIndex
ALTER INDEX "order_items_productId_idx" RENAME TO "order_items_product_id_idx";

-- RenameIndex
ALTER INDEX "order_items_variantId_idx" RENAME TO "order_items_variant_id_idx";

-- RenameIndex
ALTER INDEX "orders_branchId_idx" RENAME TO "orders_branch_id_idx";

-- RenameIndex
ALTER INDEX "orders_checkoutSessionId_key" RENAME TO "orders_checkout_session_id_key";

-- RenameIndex
ALTER INDEX "orders_merchantId_orderNumber_key" RENAME TO "orders_merchant_id_order_number_key";

-- RenameIndex
ALTER INDEX "orders_merchantId_paymentStatus_fulfillmentStatus_idx" RENAME TO "orders_merchant_id_payment_status_fulfillment_status_idx";

-- RenameIndex
ALTER INDEX "orders_merchantId_posDeviceId_localId_key" RENAME TO "orders_merchant_id_pos_device_id_local_id_key";

-- RenameIndex
ALTER INDEX "orders_merchantId_status_createdAt_idx" RENAME TO "orders_merchant_id_status_created_at_idx";

-- RenameIndex
ALTER INDEX "orders_posShiftId_idx" RENAME TO "orders_pos_shift_id_idx";

-- RenameIndex
ALTER INDEX "orders_tableId_idx" RENAME TO "orders_table_id_idx";

-- RenameIndex
ALTER INDEX "outbox_events_merchantId_createdAt_idx" RENAME TO "outbox_events_merchant_id_created_at_idx";

-- RenameIndex
ALTER INDEX "outbox_events_status_availableAt_idx" RENAME TO "outbox_events_status_available_at_idx";

-- RenameIndex
ALTER INDEX "password_reset_tokens_tokenHash_key" RENAME TO "password_reset_tokens_token_hash_key";

-- RenameIndex
ALTER INDEX "password_reset_tokens_userId_idx" RENAME TO "password_reset_tokens_user_id_idx";

-- RenameIndex
ALTER INDEX "payment_providers_merchantId_provider_key" RENAME TO "payment_providers_merchant_id_provider_key";

-- RenameIndex
ALTER INDEX "payment_providers_merchantId_status_idx" RENAME TO "payment_providers_merchant_id_status_idx";

-- RenameIndex
ALTER INDEX "payment_refunds_idempotencyKey_key" RENAME TO "payment_refunds_idempotency_key_key";

-- RenameIndex
ALTER INDEX "payment_refunds_merchantId_paymentId_idx" RENAME TO "payment_refunds_merchant_id_payment_id_idx";

-- RenameIndex
ALTER INDEX "payment_refunds_orderId_idx" RENAME TO "payment_refunds_order_id_idx";

-- RenameIndex
ALTER INDEX "payment_refunds_providerRefundTransactionId_key" RENAME TO "payment_refunds_provider_refund_transaction_id_key";

-- RenameIndex
ALTER INDEX "payment_webhook_events_merchantId_status_createdAt_idx" RENAME TO "payment_webhook_events_merchant_id_status_created_at_idx";

-- RenameIndex
ALTER INDEX "payment_webhook_events_paymentId_idx" RENAME TO "payment_webhook_events_payment_id_idx";

-- RenameIndex
ALTER INDEX "payment_webhook_events_paymentProviderId_eventId_key" RENAME TO "payment_webhook_events_payment_provider_id_event_id_key";

-- RenameIndex
ALTER INDEX "payments_idempotencyKey_key" RENAME TO "payments_idempotency_key_key";

-- RenameIndex
ALTER INDEX "payments_merchantId_status_createdAt_idx" RENAME TO "payments_merchant_id_status_created_at_idx";

-- RenameIndex
ALTER INDEX "payments_orderId_idx" RENAME TO "payments_order_id_idx";

-- RenameIndex
ALTER INDEX "payments_paymentProviderId_idx" RENAME TO "payments_payment_provider_id_idx";

-- RenameIndex
ALTER INDEX "payments_posShiftId_idx" RENAME TO "payments_pos_shift_id_idx";

-- RenameIndex
ALTER INDEX "payments_providerTransactionId_key" RENAME TO "payments_provider_transaction_id_key";

-- RenameIndex
ALTER INDEX "pos_devices_merchantId_branchId_status_idx" RENAME TO "pos_devices_merchant_id_branch_id_status_idx";

-- RenameIndex
ALTER INDEX "pos_devices_merchantId_deviceId_key" RENAME TO "pos_devices_merchant_id_device_id_key";

-- RenameIndex
ALTER INDEX "pos_shifts_merchantId_branchId_status_idx" RENAME TO "pos_shifts_merchant_id_branch_id_status_idx";

-- RenameIndex
ALTER INDEX "pos_shifts_posDeviceId_status_idx" RENAME TO "pos_shifts_pos_device_id_status_idx";

-- RenameIndex
ALTER INDEX "pos_tables_merchantId_branchId_name_key" RENAME TO "pos_tables_merchant_id_branch_id_name_key";

-- RenameIndex
ALTER INDEX "pos_tables_merchantId_branchId_status_idx" RENAME TO "pos_tables_merchant_id_branch_id_status_idx";

-- RenameIndex
ALTER INDEX "product_categories_merchantId_slug_key" RENAME TO "product_categories_merchant_id_slug_key";

-- RenameIndex
ALTER INDEX "product_categories_merchantId_sortOrder_idx" RENAME TO "product_categories_merchant_id_sort_order_idx";

-- RenameIndex
ALTER INDEX "product_categories_merchantId_status_deletedAt_idx" RENAME TO "product_categories_merchant_id_status_deleted_at_idx";

-- RenameIndex
ALTER INDEX "product_channel_visibility_productId_channel_key" RENAME TO "product_channel_visibility_product_id_channel_key";

-- RenameIndex
ALTER INDEX "product_channel_visibility_productId_idx" RENAME TO "product_channel_visibility_product_id_idx";

-- RenameIndex
ALTER INDEX "product_media_productId_sortOrder_idx" RENAME TO "product_media_product_id_sort_order_idx";

-- RenameIndex
ALTER INDEX "product_variants_merchantId_sku_key" RENAME TO "product_variants_merchant_id_sku_key";

-- RenameIndex
ALTER INDEX "product_variants_productId_idx" RENAME TO "product_variants_product_id_idx";

-- RenameIndex
ALTER INDEX "products_id_merchantId_key" RENAME TO "products_id_merchant_id_key";

-- RenameIndex
ALTER INDEX "products_merchantId_categoryId_idx" RENAME TO "products_merchant_id_category_id_idx";

-- RenameIndex
ALTER INDEX "products_merchantId_sku_key" RENAME TO "products_merchant_id_sku_key";

-- RenameIndex
ALTER INDEX "products_merchantId_slug_key" RENAME TO "products_merchant_id_slug_key";

-- RenameIndex
ALTER INDEX "products_merchantId_status_deletedAt_idx" RENAME TO "products_merchant_id_status_deleted_at_idx";

-- RenameIndex
ALTER INDEX "role_permissions_permissionId_idx" RENAME TO "role_permissions_permission_id_idx";

-- RenameIndex
ALTER INDEX "role_permissions_roleId_permissionId_key" RENAME TO "role_permissions_role_id_permission_id_key";

-- RenameIndex
ALTER INDEX "roles_merchantId_code_key" RENAME TO "roles_merchant_id_code_key";

-- RenameIndex
ALTER INDEX "roles_merchantId_idx" RENAME TO "roles_merchant_id_idx";

-- RenameIndex
ALTER INDEX "sessions_refreshTokenHash_key" RENAME TO "sessions_refresh_token_hash_key";

-- RenameIndex
ALTER INDEX "sessions_userId_revokedAt_idx" RENAME TO "sessions_user_id_revoked_at_idx";

-- RenameIndex
ALTER INDEX "shipment_events_shipmentId_occurredAt_idx" RENAME TO "shipment_events_shipment_id_occurred_at_idx";

-- RenameIndex
ALTER INDEX "shipment_items_orderItemId_idx" RENAME TO "shipment_items_order_item_id_idx";

-- RenameIndex
ALTER INDEX "shipment_items_shipmentId_orderItemId_key" RENAME TO "shipment_items_shipment_id_order_item_id_key";

-- RenameIndex
ALTER INDEX "shipments_merchantId_shipmentNumber_key" RENAME TO "shipments_merchant_id_shipment_number_key";

-- RenameIndex
ALTER INDEX "shipments_merchantId_status_createdAt_idx" RENAME TO "shipments_merchant_id_status_created_at_idx";

-- RenameIndex
ALTER INDEX "shipments_orderId_idx" RENAME TO "shipments_order_id_idx";

-- RenameIndex
ALTER INDEX "shipments_trackingNumber_idx" RENAME TO "shipments_tracking_number_idx";

-- RenameIndex
ALTER INDEX "shoppable_hotspots_productId_idx" RENAME TO "shoppable_hotspots_product_id_idx";

-- RenameIndex
ALTER INDEX "shoppable_hotspots_socialPostId_idx" RENAME TO "shoppable_hotspots_social_post_id_idx";

-- RenameIndex
ALTER INDEX "shoppable_hotspots_variantId_idx" RENAME TO "shoppable_hotspots_variant_id_idx";

-- RenameIndex
ALTER INDEX "social_post_publish_logs_socialPostId_platform_createdAt_idx" RENAME TO "social_post_publish_logs_social_post_id_platform_created_at_idx";

-- RenameIndex
ALTER INDEX "social_posts_merchantId_slug_key" RENAME TO "social_posts_merchant_id_slug_key";

-- RenameIndex
ALTER INDEX "social_posts_merchantId_status_createdAt_idx" RENAME TO "social_posts_merchant_id_status_created_at_idx";

-- RenameIndex
ALTER INDEX "users_telegramId_key" RENAME TO "users_telegram_id_key";

-- RenameIndex
ALTER INDEX "website_articles_merchantId_publishedAt_idx" RENAME TO "website_articles_merchant_id_published_at_idx";

-- RenameIndex
ALTER INDEX "website_articles_merchantId_slug_key" RENAME TO "website_articles_merchant_id_slug_key";

-- RenameIndex
ALTER INDEX "website_articles_socialPostId_key" RENAME TO "website_articles_social_post_id_key";

