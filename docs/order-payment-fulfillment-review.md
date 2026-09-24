# Order, payment and fulfillment status — review and fix tasks

A review of how `Order.status`, `Order.paymentStatus` and
`Order.fulfillmentStatus` move when someone acts on an order: checkout,
payment intents and webhooks, cancel, refund, shipments and the POS flows.

Each problem below is written as a task with where it lives, what goes wrong,
the fix and how to prove it. Line numbers are as of the review (2026-09-24,
branch `feat/cart-address-loyalty`).

**Severity**

- **P0** — money or stock ends up wrong: a customer is charged with no order,
  stock is oversold, or a paid sale has no payment record.
- **P1** — the three statuses disagree with each other or with reality, and
  someone has to fix it by hand.
- **P2** — edge cases, races and cleanup.

---

## 1. The model as it stands

Three status fields on `Order`, written by six services:

| Field | Values | Written by |
| --- | --- | --- |
| `status` | DRAFT, PENDING_PAYMENT, RESERVED, PAID, PROCESSING, FULFILLED, COMPLETED, CANCELLED, PAYMENT_FAILED, EXPIRED, REFUNDED | `OrderService`, `PaymentService`, `PosPaymentsService`, `PosService`, `InventoryService` |
| `paymentStatus` | PENDING, PARTIAL, PAID, FAILED, REFUNDED | `PaymentService`, `PosPaymentsService`, `OrderService.refund`, `PosService` |
| `fulfillmentStatus` | UNFULFILLED, PROCESSING, FULFILLED, CANCELLED | `OrderService.updateStatus` / `cancel`, `ShipmentsService.syncOrderFulfillment` |

Plus `Payment.status` (PENDING … REFUNDED), `InventoryReservation.status`
(ACTIVE, CONFIRMED, RELEASED, EXPIRED), `Shipment.status` and
`CheckoutSession.status`.

### Intended online flow

```txt
checkout confirm        -> Order PENDING_PAYMENT / PENDING / UNFULFILLED, reservations ACTIVE
POST /payments/create-intent -> Payment PENDING
webhook CONFIRMED       -> Payment CONFIRMED, reservations CONFIRMED (reserved -> sold),
                           Order PAID / PAID
webhook FAILED          -> Payment FAILED, reservations RELEASED,
                           Order PAYMENT_FAILED / FAILED, checkout CANCELLED
reservation TTL passes  -> reservations EXPIRED, Order EXPIRED (only if paymentStatus PENDING)
merchant PATCH status   -> PAID -> PROCESSING -> FULFILLED -> COMPLETED  (order-status.ts)
shipments               -> fulfillmentStatus derived from shipments (PROCESSING / FULFILLED)
refund                  -> Order REFUNDED / REFUNDED (optionally returns stock)
```

### What actually decides each field

- **Order status** follows a single straight line after PAID
  ([order-status.ts](../src/modules/order/order-status.ts)); nothing else
  advances it. Shipments never move it.
- **Fulfillment status** has two writers that disagree: the merchant's manual
  status change sets it directly, and every shipment change recomputes it from
  shipments and overwrites the manual value (see T11).
- **Payment status** is computed two different ways: online, one confirmed
  payment means PAID; on POS, it is recomputed from a ledger of payments minus
  refunds (see T7).

---

## 2. Tasks

### P0 — money or stock goes wrong

#### T1. A payment that lands after the order was cancelled, expired or failed is rejected, but the customer has already been charged

**Where**
- [payment.service.ts `confirmPayment`](../src/modules/payment/payment.service.ts#L648) — requires `order.status === 'PENDING_PAYMENT'` and every reservation `ACTIVE` and unexpired, otherwise throws.
- [order.service.ts `cancel`](../src/modules/order/order.service.ts#L508), [`cancelCheckout`](../src/modules/order/order.service.ts#L344), [`expireCheckout`](../src/modules/order/order.service.ts#L408), [inventory.service.ts `expireCheckoutStates`](../src/modules/inventory/inventory.service.ts#L601) — none of them touch open `Payment` rows.

**What happens**
1. The shopper creates an intent (Payment PENDING) and opens their banking app.
2. The reservation TTL (15 min online) passes, or the merchant cancels. The order becomes EXPIRED or CANCELLED; the Payment stays PENDING.
3. The shopper completes payment. The webhook, or the KHQR status poll, calls `confirmPayment`, which throws `Order is not awaiting payment` or `Inventory reservation has expired`.
4. The webhook event is logged FAILED and the provider keeps retrying, always failing. The money has been taken and nothing in the system says so.

The window is small for card redirects but large for KHQR: the QR is valid for 15 minutes and the reservation TTL is also 15 minutes, both starting at different moments.

**Fix**
- When an order is cancelled or expired, mark its open payments (`PENDING`/`PROCESSING`) `CANCELLED` in the same transaction.
- In `confirmPayment`, when the provider says the money arrived but the order can no longer take it, **record the truth instead of throwing**: set the Payment `CONFIRMED` (it was paid), leave the order as it is, add a `PAYMENT_RECEIVED_AFTER_CLOSE` notification and an audit entry, and mark the webhook `PROCESSED`. A merchant then refunds it or revives the order. Optionally, if stock can still be reserved, re-reserve and move the order to PAID.
- Stop treating an elapsed `expiresAt` as fatal inside `confirmPayment` while the reservation is still `ACTIVE`: the webhook proves payment happened inside the window; the sweeper just had not run yet.

**Done when**
- e2e: create intent → expire the order → send a CONFIRMED webhook → response 200, Payment `CONFIRMED`, order unchanged, one merchant notification, and a redelivery of the same webhook is a no-op.
- e2e: cancel an order with a PENDING intent → the intent is `CANCELLED`.

#### T2. Re-requesting a KHQR intent regenerates the QR and forgets the one the shopper may already have paid

**Where** [payment.service.ts `createIntent`, lines 343–365](../src/modules/payment/payment.service.ts#L343), [khqr.adapter.ts `createQr`](../src/modules/payment/adapters/khqr.adapter.ts#L35)

**What happens**
- `createIntent` returns the existing open payment when called again with the same provider, then *after* the transaction always calls `khqr.createQr` again and overwrites `providerTransactionId` with the new QR's md5.
- The QR payload embeds `expirationTimestamp: Date.now() + 15 min`, so every call produces a different md5.
- A shopper who refreshes the page (or a frontend that retries) gets a new QR. If they had already paid the first one, `check_transaction_by_md5` is now asked about the new md5 and never succeeds. The payment is never confirmed (and then T1 applies).
- `billNumber` is the constant `INV-<year>-00001` for every payment (`'00001'.padStart(3, '0')` is a no-op), so every KHQR looks like the same bill in the bank's records.

**Fix**
- Generate the KHQR once, inside intent creation, and store `qrPayload`, md5 and `expiresAt` on the Payment (for example in `metadata`). A reused intent returns the stored QR; after it expires, cancel that payment and create a new one.
- Use a real bill number: the order number, or the payment id.

**Done when** calling `create-intent` twice for the same order returns the same `qrPayload` and `providerTransactionId`.

#### T3. POS can take more money than the order total

**Where** [pos-payments.service.ts `create`, lines 49–107](../src/modules/pos/payments/pos-payments.service.ts#L49)

**What happens**
- `remainingBalance` is read outside any transaction or order lock, so two taps on two terminals (or a double-click) both see the full balance and both succeed.
- `netPaid` counts only `CONFIRMED` payments. A PENDING KHQR for the full amount leaves the remaining balance untouched, so the cashier can also take cash for the full amount; when the KHQR is paid too, the order is paid twice.

**Fix** Lock the order row (`SELECT … FOR UPDATE`) and compute the remaining balance inside the same transaction that inserts the payment, subtracting open (`PENDING`) payments as well as confirmed ones. Return the open KHQR instead of allowing a second tender for the same balance, or require cancelling it first.

**Done when** two concurrent full-amount cash payments on one order produce one success and one `409 INVALID_PAYMENT_STATE`; a cash payment while a full-amount KHQR is pending is rejected.

#### T4. A partly-paid POS order loses its stock hold, and the final payment never records the sale

**Where** [inventory.service.ts `expireReservations` / `expireCheckoutStates`](../src/modules/inventory/inventory.service.ts#L443), [pos-payments.service.ts `confirmOrderReservations`](../src/modules/pos/payments/pos-payments.service.ts#L490)

**What happens**
- POS reservations are held for 6 hours (`POS_ORDER_HOLD_MS`). A table that pays half and stays past that, or any reservation swept earlier, is expired by the sweeper: stock is released back to sale.
- `expireCheckoutStates` only expires orders whose `paymentStatus` is `PENDING`, so the PARTIAL order stays open and looks fine.
- When the rest is paid, `confirmOrderReservations` finds no `ACTIVE` reservations and silently does nothing. The order becomes PAID, but `soldStock` never increases and the goods were also available to other buyers: **oversold**.
- `confirmOrderReservations` also skips silently when `reservedStock < quantity` instead of failing.

**Fix**
- Do not expire reservations of an order that has any confirmed payment (`paymentStatus` PARTIAL): either extend them when a partial payment lands, or exclude them in the sweeper.
- When moving an order to PAID, if a stocked line has no ACTIVE reservation, move stock directly (decrement available, increment sold) under a stock lock, or refuse with a clear error. Never skip silently.

**Done when** e2e: POS order → partial cash → force reservations to expire → pay remainder → `soldStock` increased by the ordered quantity.

#### T5. The POS quick sale marks an order PAID without recording any payment

**Where** [pos.service.ts `createSale`, lines 183–350](../src/modules/pos/pos.service.ts#L183)

**What happens**
- The order is set `PAID/PAID` directly; no `Payment` row is created for CASH or any other method.
  - POS refunds need a confirmed Payment row (`pos-payments.service.ts` `refund`), so these sales cannot be refunded through POS.
  - Shift cash reconciliation and payment reports miss them entirely.
- `confirmCheckout` is called without the POS context, so `branchId`, `posDeviceId` and `posShiftId` are null on the order: branch reports miss it and it can't be sent to the kitchen.
- No loyalty grant, no `payment.confirmed` / outbox event.
- About six separate writes with no surrounding transaction: a failure halfway leaves a PENDING_PAYMENT order with CONFIRMED (sold) stock.

**Fix** Build the quick sale on the same path as a normal POS order: create the order through `PosOrdersService.create` (with device/shift context), then take payment through `PosPaymentsService.create`. That gets the Payment row, ledger-based payment status, loyalty and outbox events for free. If the endpoint must stay one call, wrap it in one transaction.

**Done when** a quick sale produces an order with branch/shift set, one CONFIRMED Payment for the total, and can be refunded through `POST /pos/payments/:id/refund`.

#### T6. A duplicate loyalty grant aborts the whole payment transaction

**Where** [loyalty.service.ts `grantForOrder`, lines 67–84](../src/modules/loyalty/loyalty.service.ts#L67)

**What happens**
- `grantForOrder` relies on the unique index `(order_id, type)` and catches the P2002 error to make grants idempotent. Inside a PostgreSQL transaction, a failed statement aborts the transaction: the catch returns normally, and the caller's next query fails with `current transaction is aborted`, rolling back the payment confirmation.
- Also, `customer.loyaltyPoints` is incremented *before* the ledger insert, so the pattern could never have been safe without a savepoint.
- It triggers whenever an order reaches PAID twice. Today that happens on POS: pay → partial refund (order back to PARTIAL) → pay again → PAID → second grant → the payment confirmation fails.

**Fix** Check for an existing `EARNED` entry for the order first and return early; only then increment and insert. Keep the unique index as the backstop. Same for `reverseForOrder`.

**Done when** calling `grantForOrder` twice in one transaction succeeds and the balance increases once.

### P1 — the statuses drift apart

#### T7. POS refunds leave `status` and `paymentStatus` contradicting each other

**Where** [pos-payments.service.ts `refund`, lines 146–251](../src/modules/pos/payments/pos-payments.service.ts#L146), [`applyPaymentStatusFromLedger`, lines 461–488](../src/modules/pos/payments/pos-payments.service.ts#L461)

**What happens**
- `applyPaymentStatusFromLedger` only ever writes `paymentStatus` when money goes down; `status` stays `PAID`. After a partial refund the order is `PAID / PARTIAL`; after refunding everything without `returnStock` it is `PAID / PENDING`, and loyalty points are not reversed.
- A `PAID / PARTIAL` order passes the POS "can take payment" and "can edit" checks, and can be shipped (T10) as if fully paid.
- Refunding the rest after an earlier partial refund with `returnStock: true` calls `orders.refund`, which requires `paymentStatus === 'PAID'`: it throws `Only a paid order can be refunded`. The last refund can never return stock.
- The full-refund branch runs `orders.refund` (own transaction) and then `paymentRefund.create` separately: if the second write fails, the order is REFUNDED with no refund record.
- No lock: two concurrent refunds can together exceed the payment amount.

**Fix**
- Decide one mapping and put it in one function used by both online and POS: net paid ≥ total → `PAID`; 0 < net < total → `PARTIAL` (status stays PAID only while fulfillment has started; otherwise PENDING_PAYMENT); net ≤ 0 after refunds → `REFUNDED / REFUNDED`, reverse loyalty.
- Allow `orders.refund` for `PARTIAL` as well, or let POS pass the ledger decision in.
- One transaction, with the order row locked, for create-refund + status update + stock return.

**Done when** e2e: pay 100 → refund 40 → order shows PARTIAL consistently; refund remaining 60 with `returnStock` → `REFUNDED / REFUNDED`, stock returned, points reversed.

#### T8. An online refund marks the order REFUNDED but leaves the payment looking paid

**Where** [order.service.ts `refund`, lines 576–660](../src/modules/order/order.service.ts#L576)

**What happens**
- Only `Order` changes. `Payment` rows stay `CONFIRMED`, no `PaymentRefund` row is written, and no provider refund is requested. Payment reports and the POS ledger (`netPaid`) still count the money as received.
- Open shipments are untouched: a refunded order can keep moving to DELIVERED. `fulfillmentStatus` is left as is.
- Only full refunds exist online.

**Fix** Write a `PaymentRefund` row per refunded payment (mark the Payment `REFUNDED` when fully refunded). Either call the provider's refund API or record the refund as manual with who did it. Cancel shipments that have not shipped yet; flag ones in transit for a return.

**Done when** after `POST /orders/:id/refund`, the payment detail shows the refund and payment totals net to zero.

#### T9. The shopper's checkout-cancel can overwrite a refunded or part-paid order

**Where** [order.service.ts `cancelCheckout`, lines 344–406](../src/modules/order/order.service.ts#L344) (reached through `POST /checkout/:id/cancel` with only the checkout token), [`cancel`, lines 508–574](../src/modules/order/order.service.ts#L508)

**What happens**
- `cancelCheckout` blocks only `paymentStatus === 'PAID'`. A `REFUNDED` order (fulfilled, then refunded) is rewritten to `CANCELLED / fulfillment CANCELLED` by anyone holding the checkout token, erasing the refund state.
- Both `cancelCheckout` and the merchant `cancel` allow `PARTIAL`: the order is cancelled while money is held, with no refund.
- Neither cancels open payment intents (T1).

**Fix** Allow cancel only when `status ∈ {PENDING_PAYMENT, RESERVED, PAYMENT_FAILED, EXPIRED}` and `paymentStatus ∈ {PENDING, FAILED}`; everything else → 409 "use the refund flow". Put the rule in one helper both methods call, and cancel open intents in the same transaction.

**Done when** cancelling a REFUNDED or PARTIAL order returns 409 and changes nothing.

#### T10. Shipments can be created for orders that were never paid

**Where** [shipments.service.ts `create`, lines 116–126](../src/modules/logistics/shipments.service.ts#L116)

**What happens** Only `CANCELLED` and `EXPIRED` are blocked. A merchant can create and progress a shipment for `PENDING_PAYMENT`, `PAYMENT_FAILED`, `PARTIAL` or `REFUNDED` orders; goods leave without payment. `OrderService.cancel` then cancels the order but leaves that shipment moving.

**Fix** Require `paymentStatus === 'PAID'`. If cash-on-delivery is planned, make it an explicit delivery-method flag and allow it only then. Cancelling an order cancels its non-shipped shipments.

**Done when** `POST /orders/:id/shipments` on an unpaid order returns 409.

#### T11. Two writers fight over `fulfillmentStatus`, and shipments never move `status`

**Where** [order.service.ts `updateStatus`, lines 455–506](../src/modules/order/order.service.ts#L455), [shipments.service.ts `syncOrderFulfillment`, lines 407–458](../src/modules/logistics/shipments.service.ts#L407)

**What happens**
- `PATCH /orders/:id/status` sets `fulfillmentStatus` straight from the requested status: `FULFILLED` with nothing shipped is accepted.
- The next shipment change recomputes from shipments and overwrites it back to `PROCESSING`/`UNFULFILLED`, clearing `fulfilledAt`.
- When every unit is DELIVERED, `fulfillmentStatus` becomes `FULFILLED` but `status` stays `PAID`: the merchant must still click PAID → PROCESSING → FULFILLED by hand, and the order list shows "paid" for delivered orders.
- `syncOrderFulfillment` sets `fulfilledAt = now()` on every call once fulfilled (the real time is lost), and resets a `CANCELLED` fulfillment to `UNFULFILLED` when the last shipment is cancelled.

**Fix** Make shipments the single source for fulfillment on orders that ship:
- First live shipment → `status` PAID → PROCESSING, `fulfillmentStatus` PROCESSING.
- All units delivered → `status` FULFILLED, `fulfillmentStatus` FULFILLED, `fulfilledAt` set once.
- `updateStatus` to FULFILLED/COMPLETED is refused while undelivered units remain on a shipping order; keep it for pickup/POS orders with no shipments.
- Never resurrect a CANCELLED order through `syncOrderFulfillment`.

**Done when** e2e: pay → create shipment → order PROCESSING; deliver all → order FULFILLED; manual FULFILLED before delivery → 409.

#### T12. Reservations expired inline never expire their order — the "Order inventory reservation has expired" error

**Where** [inventory.service.ts `reserveCheckout` line 315 → `expireLockedStock`, lines 639–654](../src/modules/inventory/inventory.service.ts#L639)

**What happens**
- When a new checkout reserves a stock row, `expireLockedStock` first expires any old ACTIVE reservations on that row whose time has passed. It does not call `expireCheckoutStates`.
- Those reservations are no longer ACTIVE, so the background sweeper never sees them either.
- Their order stays `PENDING_PAYMENT` and their checkout `CONFIRMED` forever. `create-intent` then fails with `Order inventory reservation has expired`, and the order never shows as EXPIRED in the dashboard.

**Fix** Collect the checkout ids expired inside `expireLockedStock` and run the same `expireCheckoutStates` for them (after the transaction commits). Better: one `expireOrder(checkoutSessionId)` used by the sweeper, the inline path and `expireCheckout`.

**Done when** e2e: order A's reservation passes its TTL → order B reserves the same product → order A is EXPIRED.

#### T13. One failed online payment kills the order; a stale intent blocks switching methods

**Where** [payment.service.ts `failPayment`, lines 787–897](../src/modules/payment/payment.service.ts#L787), [`createIntent`, lines 274–289](../src/modules/payment/payment.service.ts#L274)

**What happens**
- Any FAILED webhook releases stock, sets the order `PAYMENT_FAILED` and the checkout `CANCELLED`. `create-intent` requires PENDING_PAYMENT, so a declined card cannot be retried: the shopper has to rebuild the cart.
- An open PENDING intent blocks every other provider (`Order already has an open intent with another provider`). There is no endpoint to cancel an intent, and a KHQR intent stays PENDING after its QR expires. A shopper who picked KHQR can never switch to PayWay.

**Fix**
- A failed attempt fails the Payment only; keep the order `PENDING_PAYMENT` and its reservations while they are valid, so the shopper can retry. Move the order to PAYMENT_FAILED only when it expires with no successful payment.
- Add `POST /payments/:id/cancel` (checkout-token auth) and auto-cancel KHQR intents whose QR expired when a new intent is requested.

**Done when** e2e: FAILED webhook → new intent (same or other provider) on the same order succeeds.

#### T14. KHQR and PayWay confirmations skip side effects the HMAC webhook runs

**Where** [payment.service.ts `findByToken`, lines 448–476](../src/modules/payment/payment.service.ts#L448), [`handlePayWayCallback`, lines 627–636](../src/modules/payment/payment.service.ts#L627), [pos-payments.service.ts `findOne`, lines 116–141](../src/modules/pos/payments/pos-payments.service.ts#L116)

**What happens** `handleWebhook` calls `syncOrderStockAlerts` and publishes `payment.confirmed` / `payment.failed`. The KHQR status poll and the PayWay callback do neither, so anything listening for `payment.confirmed` (notifications, emails, POS screens) never hears about KHQR or PayWay payments. The POS KHQR confirmation writes no outbox event, unlike the POS cash path.

**Fix** Move "after a payment is confirmed or failed" into one method that all four paths call.

**Done when** a unit/e2e test asserts `payment.confirmed` is published for HMAC, KHQR poll and PayWay callback.

### P2 — edge cases, races, cleanup

#### T15. POS order edits break on non-stocked items and on paid orders

**Where** [pos-orders.service.ts `update`, lines 246–407](../src/modules/pos/orders/pos-orders.service.ts#L246), [`adjustReservedQuantity`, lines 506–537](../src/modules/pos/orders/pos-orders.service.ts#L506)

- Changing the quantity of an existing **non-stocked** line (café drinks, services) throws `No active stock reservation found`, because non-stocked items never get a reservation. The same for any line on a PAID order (its reservations are CONFIRMED).
- Editing a PAID order is allowed: `recomputeOrderTotals` raises `totalAmount` but `paymentStatus` stays PAID, so added items are free. Lowering the total of a PARTIAL order below what was paid does not mark it PAID.
- The edit runs as three separate transactions with no order lock.

**Fix** Skip reservation work for non-stocked products. After recomputing totals, re-run the payment-status mapping from T7. Refuse edits on PAID orders, or allow them only through a "reopen" path. One transaction with the order locked.

#### T16. Races on shipments and refunds

- [shipments.service.ts `create`](../src/modules/logistics/shipments.service.ts#L116) computes the unshipped balance without locking the order: two concurrent requests can ship the order twice.
- [shipments.service.ts `updateStatus`](../src/modules/logistics/shipments.service.ts#L270) reads then writes the shipment without a lock: two updates can both pass the transition check.
- POS `refund` (T7) has no lock.

**Fix** `SELECT … FOR UPDATE` on the order (shipment create, refund) and the shipment row (status change), as `OrderService` already does.

#### T17. Orders made only of non-stocked products never expire

**Where** expiry is driven entirely by reservations ([inventory.service.ts `expireReservations`](../src/modules/inventory/inventory.service.ts#L443)); non-stocked lines have none.

Since the 2026-09-24 fix that lets these orders take payment, an unpaid order of only non-stocked products stays `PENDING_PAYMENT` forever, and its checkout stays `CONFIRMED`.

**Fix** Also sweep by `checkout_sessions.expires_at`: expire orders still PENDING_PAYMENT with `paymentStatus` PENDING whose checkout has expired, whether or not they had reservations (through the single `expireOrder` from T12).

#### T18. Smaller issues

- `UpdateOrderStatusDto` documents only PROCESSING/FULFILLED/COMPLETED in Swagger but validates `@IsEnum(OrderStatus)`, so any status is accepted by validation (the transition map still rejects it). Use `@IsIn([...])`.
- `updateStatus` with an unchanged status returns `this.findOne(...)` (includes `timeline`) from inside a transaction, through a different connection; every other branch returns the plain order. Return the same shape.
- A `RETURNED` or `FAILED` shipment counts as live: its units cannot be re-shipped and the order stays `PROCESSING` forever. Decide whether RETURNED releases units (like CANCELLED) or moves the order to a "returned" outcome.
- `order-status.ts` has no transitions out of PROCESSING/FULFILLED other than forward: there is no way to record a cancelled-after-payment order except refund.

---

## 3. Suggested order of work

1. **T12, T1, T13** — the online payment path: stop orders getting stuck, and never lose a payment that arrived late.
2. **T2, T14** — make KHQR reliable before promoting it.
3. **T3, T4, T5, T6** — POS money and stock correctness.
4. **T7, T8, T9** — one shared payment-status and refund rule for online and POS.
5. **T10, T11, T16** — fulfillment driven by shipments.
6. **T15, T17, T18**.

A shared helper would remove most of the drift: one `OrderLifecycle` module
that owns every status write (`markPaid`, `markPaymentFailed`, `expire`,
`cancel`, `refund`, `syncFulfillment`), each taking the locked order and
enforcing the allowed combinations of the three fields. Today the same rules
are written again in `OrderService`, `PaymentService`, `PosPaymentsService`,
`PosService`, `InventoryService` and `ShipmentsService`, and they have already
diverged.
