# Storefront Cart & Address Flow

How a shopper's cart and address book work across the three ways an order can
start — anonymous, signed-in, and staff-assisted — plus the loyalty points an
account earns.

The code lives in [`src/modules/storefront/cart`](../src/modules/storefront/cart),
[`src/modules/storefront/address`](../src/modules/storefront/address),
[`src/modules/storefront/context`](../src/modules/storefront/context),
[`src/modules/address`](../src/modules/address),
[`src/modules/pos/carts`](../src/modules/pos/carts) and
[`src/modules/loyalty`](../src/modules/loyalty). This doc is the narrative map;
the code wins if the two disagree.

---

## 1. Two credentials, not one

The storefront used to be entirely anonymous. It no longer is — a cart now
accepts **either or both** of two independent credentials:

```txt
X-Cart-Token      opaque 32-byte token, SHA-256 hashed at rest, constant-time
                  compared. Proves "I hold this cart". No account needed.

Authorization     the normal user JWT. Proves "I am this user account".
  Bearer <jwt>    Optional on cart routes, required on account address routes.
```

[`OptionalJwtAuthGuard`](../src/modules/authenticated/guards/optional-jwt-auth.guard.ts)
is what makes the dual mode work: it populates `request.user` when a valid
bearer token is present and lets the request through untouched when it is not.
`JwtAuthGuard` would reject the anonymous half, so authorization decisions stay
in the services, which know what an absent user means.

`CartController` and `GuestAddressController` are `@Public()` **plus**
`@UseGuards(OptionalJwtAuthGuard)` — without that guard a `@Public()` route
never populates `request.user` at all, so every signed-in behaviour here
silently stops. `StorefrontAddressController` and
`StorefrontLoyaltyController` are deliberately *not* `@Public()`, so the global
`JwtAuthGuard` enforces a real bearer token.

A cart route accepts **either** credential and needs only one:
`CartService.authenticate` authorizes a caller who presents a matching
`X-Cart-Token` *or* a JWT whose user is the cart's `ownerId`. That is what lets
a shopper who signs in on a new device reach a cart whose token they never
had. Once a cart is owned it stops being transferable: a *different* signed-in
shopper presenting the token is rejected, because the cart now exposes that
account's saved addresses.

## 2. The three identity columns

Three nullable columns carry identity, and confusing them is the single
biggest source of bugs in this area:

```txt
carts.customer_id              the merchant-side Customer row (POS walk-ins
                               live in the same table). Orders hang off this.

carts.owner_id                 the signed-in SHOPPER's users.id. Only ever a
                               shopper; never staff.

carts.created_by_id            the STAFF member who built this cart for
                               someone else (a POS phone/walk-in order).

carts.merged_into_cart_id      set when this cart was folded into another on
                               sign-in; the cart is then status MERGED.

customer_addresses.cart_id     the cart an address was saved through. Exists
                               so a guest cart linked to a Customer only by a
                               typed email cannot read back that customer's
                               whole address book.
```

`customer_addresses` carries the same `owner_id` / `created_by_id` split, for
the same reason. Keeping them apart is not cosmetic: `StorefrontContextService`
treats a non-null `owner_id` as proof that a user account belongs to that
customer, so a staff id sitting in that column made a cashier resolve to
whichever customer they last served. See TODO-A.

[`StorefrontContextService.resolveCustomerForUser`](../src/modules/storefront/context/storefront-context.service.ts)
is the one place that maps a signed-in shopper to their `Customer` row. Both
the account address book and cart binding call it, so the two cannot drift
apart and start creating a second customer row for the same person. Its
resolution order is: an address they already own → a `Customer` with a
matching email → create one.

## 3. The flows

### 3a. Guest

```txt
POST   /storefront/:slug/cart                    -> cart + cartToken (once)
POST   /storefront/:slug/cart/:id/items          (X-Cart-Token)
PATCH  /storefront/:slug/cart/:id/contact        name + email or phone
POST   /storefront/:slug/cart/:id/addresses      -> resolves/creates Customer
PATCH  .../addresses/:addressId/assign           SHIPPING or BILLING
GET    /storefront/:slug/cart/:id/delivery-options
PATCH  /storefront/:slug/cart/:id/delivery
POST   /storefront/:slug/cart/:id/checkout       -> checkout session + token
```

The contact step is mandatory before the first address: a guest has no
account, so the cart's name plus an email or phone is the only thing that can
identify which `Customer` the address belongs to. That is the entire reason
`PATCH /cart/:id/contact` exists.

### 3b. Signed-in shopper

Same routes, with `Authorization: Bearer <jwt>` added. Two things change:

- **Cart binding and merge.** On the first authenticated request,
  `CartService.authenticate` sees `user && !cart.ownerId` and calls
  `bindOwner`: it sets `owner_id` and `customer_id` on the cart, re-owns every
  address saved through that cart, fills any blank contact fields from the
  account, and folds in every *other* live cart the shopper owns —
  `mergeAbandonedCarts` sums quantities onto matching lines by `line_key`
  rather than stacking duplicates, exactly as `addItem` does. `customer_id` is
  *overwritten* on purpose — a guest cart may have been linked to some
  `Customer` purely because someone typed that email into the contact form,
  and a signed-in shopper must end up on their own record.

  The cart the shopper is **holding** survives the merge and the older ones
  are marked `MERGED`. It has to be that way round: only the held cart's token
  is in the client's hands, and the older cart's token was never stored in a
  recoverable form. Only an `ACTIVE` cart is ever claimed — re-pointing a
  `CONVERTED` cart's `customer_id` would rewrite history.

- **A token-free lookup.** `GET /storefront/:slug/cart/mine` returns the
  account's current cart with no `X-Cart-Token` at all.
- **An account address book**, independent of any cart:

```txt
GET    /storefront/:slug/cart/mine               (JWT, no cart token)
GET    /storefront/:slug/addresses               (JWT, no cart anywhere)
POST   /storefront/:slug/addresses
PATCH  /storefront/:slug/addresses/:addressId
DELETE /storefront/:slug/addresses/:addressId
GET    /storefront/:slug/loyalty                 points balance + ledger
```

Those addresses are assignable to a cart through the same
`PATCH /cart/:id/addresses/:addressId/assign` route, because both surfaces
resolve to the same `customer_id` via `StorefrontContextService`.

### 3c. Staff-assisted (POS)

```txt
POST   /pos/customers/:customerId/carts          pos.order.create
GET    /pos/carts                                carts I built
GET    /pos/carts/:cartId                        any cart in the merchant
POST   /pos/carts/:cartId/items                  pos.order.create
PATCH  /pos/carts/:cartId/items/:itemId
DELETE /pos/carts/:cartId/items/:itemId
DELETE /pos/carts/:cartId/items
PATCH  /pos/carts/:cartId/contact
POST   /pos/carts/:cartId/checkout               -> a POS order
POST   /pos/customers/:customerId/addresses      pos.customer.manage
GET    /pos/addresses                            addresses I saved
GET    /pos/customers/:customerId/loyalty        pos.customer.manage
```

`CartService.create` rejects `sourceChannel: POS` outright — the public
storefront entry point must never mint a POS cart. Staff go through
`CartService.createForStaff` instead, a separate permission-gated path that
links the cart to both the customer and the staff member.

Every POS cart route authorizes through `RequireMerchant` plus a POS
permission, **never** through the cart token: the token is issued once at
creation and cannot be read back, so token-based auth would lock staff out of
their own cart the moment they lost the response. Mutations are scoped to the
merchant rather than to the creator, so a colleague can pick up a phone order
mid-call; only the *listings* are scoped to the staff member.

Checkout goes through `PosOrdersService`, not `CheckoutService` — the latter
rejects the POS channel outright, and a POS order needs a device, a shift and
the generous inventory hold an open tab implies, all of which already live in
the POS order path. The cart is marked `CONVERTED` only after the order
exists, so a failure leaves it intact and re-ringable.

## 4. Address visibility

[`GuestAddressService.visibility`](../src/modules/storefront/address/guest-address.service.ts)
decides which of a customer's addresses a given cart may read. The rules,
strictest last:

| Cart | Sees |
|---|---|
| Staff-built (`owner_id` set, channel `POS`) | the customer's whole address book |
| Signed-in shopper (`owner_id` set) | their own addresses + anything saved through this cart |
| Guest (no `owner_id`) | only what was saved through this cart |

The middle row matters: a signed-in shopper does **not** get the customer's
whole book, because the cart's customer link can still come from typed contact
details. Granting more would turn a guessed email back into an address-book
leak. Do not "simplify" these three cases into one.

This is also why [`address/`](../src/modules/address) owns only the *mechanics*
of an address — the canonical select, normalisation, the
one-default-per-customer invariant, the soft-delete that detaches carts — and
never who may see one. Storage is genuinely shared across the three surfaces;
access is genuinely not. Each surface (`storefront/address`,
`storefront/address/guest`, `pos/customers/addresses`) keeps its own policy and
calls `AddressService` for the rest.

## 5. Re-pricing

The cart stores product/variant/quantity only. Prices come from
`CartPricingService` and delivery fees from `DeliveryQuoteService` on **every**
read, so a cart left open for a week cannot check out at last week's price or
quote a delivery fee the merchant has since changed. Repeat adds of the same
product collapse onto one line via the `line_key` unique index rather than
stacking duplicate rows.

---

## 6. Loyalty points

Off by default. A merchant turns it on with `merchants.loyalty_enabled` and
sets `loyalty_points_per_unit` (points per whole currency unit).

[`LoyaltyService`](../src/modules/loyalty/loyalty.service.ts) has two entry
points, both taking the **caller's transaction**, so points move in the same
commit as the payment that earned them or not at all:

```txt
grantForOrder(tx, orderId)     called wherever an order reaches PAID
reverseForOrder(tx, orderId)   called from OrderService.refund
```

Three rules carry the design:

- **Earning is gated on `order.owner_id`, not `order.customer_id`.** A guest
  order links to a `Customer` the moment someone types a matching email into
  the contact form, which proves nothing. Granting on `customer_id` alone
  would let anyone who guesses a shopper's email top up that shopper's
  balance — the same trust problem `visibility()` solves for addresses. The
  owner is carried `cart → checkout_session → order`, and `whitelist: true` on
  the global `ValidationPipe` means a client cannot inject it.
- **Every movement is a ledger row**, uniquely keyed `(order_id, type)`. The
  paid transition is reachable from a webhook, a poll and a manual
  confirmation, and those race; the unique index turns a double grant into a
  conflict that `grantForOrder` swallows, so retries are free.
- **A refund reverses what was granted**, not a recomputed amount, so a
  merchant changing the rate afterwards cannot strand a balance.

`customers.loyalty_points` is a denormalised running total, written in the same
transaction as the entry that explains it.

Granting is wired into all three paid transitions: the storefront payment
confirmation in [`payment.service.ts`](../src/modules/payment/payment.service.ts),
and the POS ledger-driven one in
[`pos-payments.service.ts`](../src/modules/pos/payments/pos-payments.service.ts).

---

## 7. Fix log

All items from the 2026-09-22 review are implemented. Kept as a record of what
each change was for, because several of them look arbitrary without it.

### TODO-A — `owner_id` overloaded, staff cross-wired to customers `[x]`

> **Was: high — live data-integrity and disclosure bug.**

`PosAddressesService` wrote the **staff** `user.id` into
`customer_addresses.owner_id`, while `StorefrontContextService` read that
column as "the **shopper's** account". Staff member Sara saves an address for
walk-in customer Bob; Sara later signs into the storefront and her cart,
orders and address book attach to **Bob's** customer record, and
`StorefrontAddressService.findAll` lists Bob's street address back to her.

**Fixed** by splitting the column in
`20260922000000_split_owner_from_creator_and_loyalty`: `owner_id` is now only
ever a shopper's own account and `created_by_id` only ever the staff member.
The migration moves existing rows — POS carts by `source_channel`, addresses by
"the owner holds a membership in this address's merchant", which separates the
two populations without guessing. `PosCartsService`, `PosAddressesService` and
`GuestAddressService.visibility` all read the new column.

### TODO-B — `GET /pos/carts` leaked `access_token_hash` `[x]`

`findManyByOwner` used a bare `include`, so Prisma returned every scalar
including the cart credential's verifier. Now `findManyByCreator`, with an
explicit `cartListSelect` that enumerates what a listing may expose.

### TODO-C — POS carts could be created but never used `[x]`

A staff cart could not be modified (the token is issued once and cannot be read
back) or checked out (`CheckoutService` rejects the POS channel). Both fixed:
seven new merchant-scoped routes in `PosCartsController`, and a checkout that
goes through `PosOrdersService`. `CartService`'s line operations were split
into an authenticated wrapper plus an `…To`/`…On` operation taking an
already-authorized cart, so POS reuses line merging, purchasability checks and
re-pricing rather than forking them.

### TODO-D — guest cart claimed on login, not merged `[x]`

`bindOwner` now folds every other live cart the shopper owns into the one they
are holding (`mergeAbandonedCarts`), and `GET /cart/mine` plus dual-credential
`authenticate` make a cart reachable without its token. See §1 and §3b.

### TODO-E — binding fired on only 2 of 10 routes `[x]`

`@CurrentUser()` is now threaded through every cart route and passed to
`authenticate`, so logging in and immediately adding an item binds the cart.

### TODO-F — `bindOwner` ignored cart status `[x]`

Binding is now conditional on `cart.status === 'ACTIVE'`.

### TODO-G — whoever held the token claimed the cart `[x]`

Resolved by tightening rather than accepting: once a cart has an `owner_id`, a
*different* signed-in shopper presenting the token is rejected. An anonymous
holder is still allowed — that is the owner's own browser before it signed in.

### TODO-H — guest checkout permitted a fully anonymous order `[x]`

`checkoutCart` now requires a contact name plus an email or phone. A signed-in
shopper never trips it: `bindOwner` fills both from their account.

### TODO-I — loyalty points did not exist `[x]`

Built as described in §6.

### TODO-J — docs surface registration `[x]`

`PosCartsModule` and `StorefrontLoyaltyModule` are registered in
[`api-surfaces.ts`](../src/docs/api-surfaces.ts), and the storefront surface
now calls `addBearerAuth()` so Swagger UI can authorize its JWT-backed routes.

---

## 8. Still open

- **No integration tests** cover the cart or address flows. `LoyaltyService`
  has unit coverage
  ([`loyalty.service.spec.ts`](../src/modules/loyalty/loyalty.service.spec.ts));
  the merge, the dual-credential `authenticate` and the visibility rules are
  verified only by hand.
- **The migration has not been run** against any database — it is written but
  unapplied. The two `UPDATE` statements that move staff rows are the part to
  watch on first apply.
- **`bindOwner` resolves the `Customer` outside its transaction**, so a failed
  bind can leave an orphan customer row. Pre-existing, harmless, worth tidying.
- **Merging carries lines only.** A merged-away cart's shipping address and
  delivery choice are dropped rather than adopted; the survivor keeps its own.
- **`AddressService` has no unit tests.** The defaults invariant and the
  normaliser are now single-sourced, which makes them worth testing directly;
  nothing covers them yet.
