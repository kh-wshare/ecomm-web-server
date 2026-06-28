# Merchant Commerce Hub — Swagger / OpenAPI TODO

## Purpose

Create separate OpenAPI documents for user, merchant, and platform-admin APIs.
Each document must expose only the operations intended for its audience.

Swagger document separation is not an authorization boundary. Every private API
must still use JWT, merchant-scope, role, and permission guards as appropriate.

---

## 1. Audience and Role Boundaries

### User API

Account-level and authentication operations that do not operate directly on a
merchant resource.

Examples:

- Register and login.
- Refresh token and logout.
- Password recovery and password change.
- Current user profile.
- List merchant memberships.
- Switch active merchant.
- Accept a merchant invitation.

### Merchant API

Tenant-scoped dashboard operations for merchant members with roles such as
`owner`, `admin`, `manager`, `staff`, and `viewer`.

Examples:

- Merchant profile and settings.
- Merchant staff, roles, and permissions.
- Products, inventory, themes, orders, payments, and social posts.
- Merchant audit logs and dashboard data.

The merchant `admin` role is limited to its merchant. It is not a platform
administrator.

### Platform-Admin API

Platform operations performed by trusted internal administrators. Introduce an
explicit platform-level authorization model such as `PlatformRole`; do not reuse
merchant membership roles.

Examples:

- Search and inspect platform users and merchants.
- Suspend or reactivate merchants.
- Block or reactivate users.
- Review platform audit and security events.
- Perform explicitly approved support operations.

---

## 2. Document Routes

- [ ] Serve user Swagger UI at `GET /docs/user`.
- [ ] Serve user OpenAPI JSON at `GET /docs/user/openapi.json`.
- [ ] Serve merchant Swagger UI at `GET /docs/merchant`.
- [ ] Serve merchant OpenAPI JSON at `GET /docs/merchant/openapi.json`.
- [ ] Serve platform-admin Swagger UI at `GET /docs/admin`.
- [ ] Serve platform-admin OpenAPI JSON at `GET /docs/admin/openapi.json`.
- [ ] Configure document titles, descriptions, versions, and contact metadata.
- [ ] Use the same API versioning strategy across all three documents.
- [ ] Make Swagger enablement configurable with environment variables.

Recommended configuration:

```env
SWAGGER_ENABLED=true
SWAGGER_USER_ENABLED=true
SWAGGER_MERCHANT_ENABLED=true
SWAGGER_ADMIN_ENABLED=false
```

---

## 3. NestJS Module Boundaries

- [ ] Define explicit modules included in each `SwaggerModule.createDocument`
      call.
- [ ] Keep account/auth controllers in the user document.
- [ ] Keep tenant-scoped controllers in the merchant document.
- [ ] Keep platform-operation controllers in the platform-admin document.
- [ ] Extract shared DTOs and response schemas without exposing unrelated routes.
- [ ] Prevent `deepScanRoutes` from pulling unintended controllers into a
      document.
- [ ] Give every operation a stable, unique `operationId`.

Recommended structure:

```txt
src/
├── docs/
│   └── swagger.ts
└── modules/
    ├── auth/
    ├── users/
    ├── merchants/
    ├── merchant-users/
    └── platform-admin/
```

---

## 4. User Document

- [ ] Document `POST /auth/register-merchant`.
- [ ] Document `POST /auth/login`.
- [ ] Document `POST /auth/refresh`.
- [ ] Document `POST /auth/logout`.
- [ ] Document `POST /auth/logout-all`.
- [ ] Document `GET /auth/me`.
- [ ] Document `POST /auth/switch-merchant`.
- [ ] Document forgot, reset, and change-password endpoints.
- [ ] Document invitation acceptance.
- [ ] Document which endpoints are public and which require authentication.
- [ ] Document validation errors without exposing account-existence details.
- [ ] Never expose password hashes, token hashes, or internal session fields.

---

## 5. Merchant Document

- [ ] Add bearer authentication to all private merchant operations.
- [ ] Document how active merchant context is selected.
- [ ] If `X-Merchant-ID` is retained, define it once as a reusable header
      parameter and require it to match authorized token context.
- [ ] Document the permission required by every sensitive operation.
- [ ] Document merchant roles and their limits.
- [ ] Tag operations by domain: merchant, staff, catalog, inventory, theme,
      order, payment, social, dashboard, and audit.
- [ ] Document pagination, filtering, sorting, and soft-deletion behavior.
- [ ] Document `401` for invalid authentication and `403` for insufficient
      merchant access or permission.
- [ ] Do not expose platform-admin operations in this document.

---

## 6. Platform-Admin Document

- [ ] Create a dedicated platform-admin module and controllers.
- [ ] Require both valid authentication and an explicit platform-admin guard.
- [ ] Document platform roles independently from merchant roles.
- [ ] Document all high-impact operations and their required platform
      permission.
- [ ] Require an audit reason for suspension, blocking, impersonation, or other
      support operations.
- [ ] Avoid exposing secrets, password hashes, refresh-token hashes, payment
      credentials, or unnecessary personal data.
- [ ] Do not expose platform-admin operations in user or merchant documents.
- [ ] Disable the admin document by default in production.
- [ ] If enabled in production, protect both its UI and OpenAPI JSON endpoints
      with an additional network or identity access layer.

---

## 7. Authentication Schemes

- [ ] Define an `access-token` HTTP bearer scheme.
- [ ] If refresh tokens use cookies, define a separate secure cookie scheme.
- [ ] Apply security schemes only to endpoints that require them.
- [ ] Document access-token expiry and refresh behavior.
- [ ] Document required headers without including real credentials in examples.
- [ ] Ensure Swagger authorization state is not shared unexpectedly between
      documents.

Recommended browser token handling:

```txt
Access token: short-lived and held in memory.
Refresh token: Secure, HttpOnly, SameSite cookie.
```

---

## 8. Shared Schemas and Responses

- [ ] Create response DTOs rather than documenting Prisma entities directly.
- [ ] Create sanitized `UserDto`, `MerchantDto`, `MerchantAccessDto`, and
      `SessionDto` schemas.
- [ ] Create reusable validation, unauthorized, forbidden, not-found, conflict,
      rate-limit, and internal-error schemas.
- [ ] Document pagination metadata consistently.
- [ ] Add realistic request and response examples using fictional data.
- [ ] Document enums and permission codes from one source of truth.
- [ ] Mark nullable and optional fields accurately.
- [ ] Prevent internal fields from appearing through automatic schema inference.

---

## 9. Documentation Security

- [ ] Treat Swagger access controls separately from API authorization.
- [ ] Disable “try it out” where an environment should be read-only.
- [ ] Do not place real tokens, credentials, emails, or production URLs in
      examples.
- [ ] Configure an explicit Content Security Policy for Swagger UI.
- [ ] Review whether user and merchant documents may be public in production.
- [ ] Keep platform-admin documentation private.
- [ ] Record Swagger enablement and access decisions in deployment
      documentation.

---

## 10. Tests and CI

- [ ] Test that each Swagger UI route follows environment configuration.
- [ ] Test that each OpenAPI JSON route follows environment configuration.
- [ ] Assert that user operations exist only in the intended document.
- [ ] Assert that merchant operations exist only in the merchant document.
- [ ] Assert that platform-admin operations exist only in the admin document.
- [ ] Assert that private operations declare the correct security scheme.
- [ ] Assert that merchant operations document merchant context and permissions.
- [ ] Assert that sensitive fields are absent from every generated schema.
- [ ] Validate all three OpenAPI documents in CI.
- [ ] Detect unintended OpenAPI breaking changes in pull requests.

---

## 11. Definition of Done

- [ ] Three independently generated OpenAPI documents exist.
- [ ] Every implemented API operation appears in exactly the intended
      document or documents.
- [ ] User, merchant, and platform-admin authorization concepts are not mixed.
- [ ] DTOs and examples contain no sensitive fields.
- [ ] Security schemes and documented error responses match runtime behavior.
- [ ] Swagger route exposure is safe for the target deployment environment.
- [ ] Automated tests prevent cross-document route leakage.
