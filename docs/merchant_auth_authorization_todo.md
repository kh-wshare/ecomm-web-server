# Merchant Commerce Hub — Authentication & Authorization TODO

## Purpose

Authentication and authorization must be implemented before product, inventory, checkout, payment, theme builder, or social commerce. This document defines the required auth system, permission model, role model, API guards, frontend route protection, and security tasks.

---

## 1. Critical Rules

```txt
1. Every dashboard API must require login.
2. Every merchant resource must be scoped by merchantId.
3. A user must never access another merchant's data.
4. UI permission hiding is not enough. Backend permission guard must enforce sensitive actions.
5. Refresh tokens must be stored as hashes only.
6. Payment, inventory, refund, and role-management APIs need strict permission checks.
7. Every important action should write audit logs.
```

---

## 2. Backend Auth Modules

- [ ] Create `auth` module.
- [ ] Create `users` module.
- [ ] Create `roles` module.
- [ ] Create `permissions` module.
- [ ] Create `sessions` module.
- [ ] Create `merchant-users` module.
- [ ] Create `audit-log` module.

---

## 3. Database Tables

### Users

- [ ] Create `users` table.

```ts
users {
  id: uuid
  fullName: string
  email: string
  phone?: string
  passwordHash: string
  status: 'active' | 'inactive' | 'blocked'
  mustChangePassword: boolean
  lastLoginAt?: datetime
  createdAt: datetime
  updatedAt: datetime
  deletedAt?: datetime
}
```

### Merchants

- [x] Create `merchants` table.

```ts
merchants {
  id: uuid
  name: string
  slug: string
  email?: string
  phone?: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: datetime
  updatedAt: datetime
  deletedAt?: datetime
}
```

### Merchant Users

- [ ] Create `merchant_users` table.

```ts
merchant_users {
  id: uuid
  merchantId: uuid
  userId: uuid
  roleId: uuid
  status: 'active' | 'invited' | 'disabled'
  invitedBy?: uuid
  joinedAt?: datetime
  createdAt: datetime
  updatedAt: datetime
}
```

Rules:

```txt
One user can belong to many merchants.
One merchant can have many users.
Each user has a role inside each merchant.
```

### Roles

- [ ] Create `roles` table.

```ts
roles {
  id: uuid
  merchantId?: uuid
  name: string
  code: string
  description?: string
  isSystemRole: boolean
  createdAt: datetime
  updatedAt: datetime
}
```

Default roles:

```ts
type MerchantRole = 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'
```

### Permissions

- [ ] Create `permissions` table.

```ts
permissions {
  id: uuid
  module: string
  action: string
  code: string
  description?: string
}
```

Default permissions:

```ts
const permissions = [
  'merchant.read',
  'merchant.update',
  'user.invite',
  'user.read',
  'user.update',
  'user.remove',
  'product.create',
  'product.read',
  'product.update',
  'product.delete',
  'inventory.read',
  'inventory.adjust',
  'theme.read',
  'theme.update',
  'theme.publish',
  'order.read',
  'order.update',
  'order.cancel',
  'order.refund',
  'payment.read',
  'payment.provider_manage',
  'social_post.create',
  'social_post.read',
  'social_post.update',
  'social_post.publish',
  'dashboard.read',
]
```

### Role Permissions

- [ ] Create `role_permissions` table.

```ts
role_permissions {
  id: uuid
  roleId: uuid
  permissionId: uuid
  createdAt: datetime
}
```

### Sessions

- [ ] Create `sessions` table.

```ts
sessions {
  id: uuid
  userId: uuid
  refreshTokenHash: string
  userAgent?: string
  ipAddress?: string
  expiresAt: datetime
  revokedAt?: datetime
  createdAt: datetime
}
```

### Password Reset Tokens

- [ ] Create `password_reset_tokens` table.

```ts
password_reset_tokens {
  id: uuid
  userId: uuid
  tokenHash: string
  expiresAt: datetime
  usedAt?: datetime
  createdAt: datetime
}
```

### Audit Logs

- [ ] Create `audit_logs` table.

```ts
audit_logs {
  id: uuid
  merchantId?: uuid
  userId?: uuid
  action: string
  entityType: string
  entityId?: string
  before?: json
  after?: json
  ipAddress?: string
  userAgent?: string
  createdAt: datetime
}
```

---

## 4. Authentication APIs

### Register Merchant Owner

- [ ] `POST /auth/register-merchant`

Payload:

```ts
{
  merchantName: string
  fullName: string
  email: string
  phone?: string
  password: string
}
```

Flow:

- [ ] Validate payload.
- [ ] Create user.
- [ ] Create merchant.
- [ ] Create owner role link.
- [ ] Create default roles.
- [ ] Create default permissions.
- [ ] Create session.
- [ ] Return access token and refresh token.

### Login

- [ ] `POST /auth/login`

Payload:

```ts
{
  email: string
  password: string
}
```

Response:

```ts
{
  accessToken: string
  refreshToken: string
  user: UserDto
  merchants: MerchantAccessDto[]
}
```

Flow:

- [ ] Find user by email.
- [ ] Check password.
- [ ] Check user status.
- [ ] Create session.
- [ ] Update `lastLoginAt`.
- [ ] Return tokens.

### Refresh Token

- [ ] `POST /auth/refresh`

Flow:

- [ ] Hash refresh token.
- [ ] Find active session.
- [ ] Check expiry.
- [ ] Generate new access token.
- [ ] Rotate refresh token.
- [ ] Update session.
- [ ] Return new tokens.

### Logout

- [ ] `POST /auth/logout`
- [ ] Revoke current session.

### Logout All Devices

- [ ] `POST /auth/logout-all`
- [ ] Revoke all active sessions for current user.

### Current Profile

- [ ] `GET /auth/me`

### Switch Merchant Context

- [ ] `POST /auth/switch-merchant`

Payload:

```ts
{
  merchantId: string
}
```

JWT should include:

```ts
{
  sub: userId
  merchantId: string
  role: string
  permissions: string[]
}
```

---

## 5. Authorization Matrix

| Module | Owner | Admin | Manager | Staff | Viewer |
|---|---:|---:|---:|---:|---:|
| Dashboard View | Yes | Yes | Yes | Yes | Yes |
| Merchant Settings | Yes | Yes | No | No | No |
| Invite Users | Yes | Yes | No | No | No |
| Manage Roles | Yes | No | No | No | No |
| Create Product | Yes | Yes | Yes | No | No |
| Update Product | Yes | Yes | Yes | No | No |
| Delete Product | Yes | Yes | No | No | No |
| View Inventory | Yes | Yes | Yes | Yes | Yes |
| Adjust Inventory | Yes | Yes | Yes | No | No |
| Publish Theme | Yes | Yes | No | No | No |
| View Orders | Yes | Yes | Yes | Yes | Yes |
| Update Orders | Yes | Yes | Yes | Yes | No |
| Refund Orders | Yes | Yes | No | No | No |
| Manage Payments | Yes | Yes | No | No | No |
| Publish Social Posts | Yes | Yes | Yes | No | No |

---

## 6. Backend Guards

### JWT Auth Guard

- [ ] Create `JwtAuthGuard`.
- [ ] Validate access token.
- [ ] Attach user to request.
- [ ] Reject expired tokens.
- [ ] Reject invalid tokens.

### Merchant Scope Guard

- [ ] Create `MerchantScopeGuard`.
- [ ] Check user belongs to merchant.
- [ ] Check merchant is active.
- [ ] Attach merchant context to request.
- [ ] Prevent cross-merchant data access.

### Permission Guard

- [ ] Create `PermissionGuard`.
- [ ] Read required permission from route metadata.
- [ ] Check user permission from JWT or database.
- [ ] Reject if permission is missing.

Example:

```ts
@UseGuards(JwtAuthGuard, MerchantScopeGuard, PermissionGuard)
@RequirePermission('product.create')
@Post('/products')
createProduct() {}
```

### Role Guard

- [ ] Create `RoleGuard`.
- [ ] Use only for route-level role restrictions.

---

## 7. Backend Decorators

- [ ] Create `@CurrentUser()`.
- [ ] Create `@CurrentMerchant()`.
- [ ] Create `@RequirePermission(permissionCode)`.
- [ ] Create `@RequireRole(roleCode)`.
- [ ] Create `@Public()`.

---

## 8. JWT Payload

```ts
{
  sub: string
  email: string
  merchantId: string
  role: string
  permissions: string[]
  sessionId: string
  iat: number
  exp: number
}
```

Recommended expiry:

```txt
Access token: 15 minutes
Refresh token: 7 to 30 days
```

---

## 9. Password Security

- [ ] Hash password using Argon2 or bcrypt.
- [ ] Never store plain password.
- [ ] Validate password strength.
- [ ] Add forgot password endpoint.
- [ ] Add reset password endpoint.
- [ ] Add change password endpoint.
- [ ] Revoke sessions after password change.
- [ ] Add `mustChangePassword` support for invited staff.

---

## 10. Staff Invitation

### Invite Staff

- [ ] `POST /merchant-users/invite`

Payload:

```ts
{
  email: string
  roleId: string
}
```

Flow:

- [ ] Check permission `user.invite`.
- [ ] Create invitation token.
- [ ] Create `merchant_user` with invited status.
- [ ] Send invite email.

### Accept Invitation

- [ ] `POST /merchant-users/accept-invite`

Payload:

```ts
{
  token: string
  fullName: string
  password: string
}
```

Flow:

- [ ] Validate invitation token.
- [ ] Create user if not exists.
- [ ] Attach user to merchant.
- [ ] Set `merchant_user` status active.
- [ ] Create session.

### Remove Staff

- [ ] `DELETE /merchant-users/:id`
- [ ] Only owner/admin can remove staff.
- [ ] Owner cannot remove themselves if they are the only owner.

---

## 11. Frontend Auth Tasks

### Pages

- [ ] Create `/auth/login`.
- [ ] Create `/auth/register`.
- [ ] Create `/auth/forgot-password`.
- [ ] Create `/auth/reset-password`.
- [ ] Create `/auth/invite`.

### State

- [ ] Store access token securely.
- [ ] Store refresh token securely.
- [ ] Create auth context/store.
- [ ] Load current user on app start.
- [ ] Refresh token automatically when access token expires.
- [ ] Logout when refresh token fails.
- [ ] Clear auth state after logout.

Recommended state:

```ts
type AuthState = {
  user: User | null
  activeMerchant: MerchantAccess | null
  merchants: MerchantAccess[]
  accessToken: string | null
  isAuthenticated: boolean
}
```

---

## 12. Protected Routes

- [ ] Create dashboard protected layout.
- [ ] Redirect unauthenticated users to login.
- [ ] Prevent logged-in users from opening login page.
- [ ] Show loading state while checking session.
- [ ] Handle expired session cleanly.

---

## 13. Merchant Switcher

- [ ] Add merchant switcher to dashboard navbar.
- [ ] Show all merchants user has access to.
- [ ] Switch active merchant.
- [ ] Refetch permissions after merchant switch.
- [ ] Refresh dashboard data after merchant switch.

---

## 14. Frontend Authorization

### Helpers

- [ ] Create `can(permission)` helper.
- [ ] Create `hasRole(role)` helper.

Example:

```tsx
{can('product.create') && (
  <Button>Create Product</Button>
)}
```

### UI Rules

- [ ] Hide create product button if user lacks `product.create`.
- [ ] Hide stock adjustment button if user lacks `inventory.adjust`.
- [ ] Hide publish theme button if user lacks `theme.publish`.
- [ ] Hide refund button if user lacks `order.refund`.
- [ ] Hide payment settings if user lacks `payment.provider_manage`.
- [ ] Hide staff management if user lacks `user.invite`.
- [ ] Disable restricted actions with tooltip explanation.

---

## 15. Frontend Auth Hooks

- [ ] `useLogin`
- [ ] `useRegisterMerchant`
- [ ] `useLogout`
- [ ] `useRefreshToken`
- [ ] `useCurrentUser`
- [ ] `useSwitchMerchant`
- [ ] `useForgotPassword`
- [ ] `useResetPassword`
- [ ] `useAcceptInvite`
- [ ] `usePermissions`
- [ ] `useCan`

---

## 16. API Client Auth Logic

- [ ] Attach access token to every private request.

```ts
Authorization: Bearer <accessToken>
```

- [ ] Attach merchant context header.

```ts
X-Merchant-ID: <merchantId>
```

- [ ] Handle `401 Unauthorized`.
  - [ ] Try refresh token.
  - [ ] Retry original request.
  - [ ] Logout if refresh fails.

- [ ] Handle `403 Forbidden`.
  - [ ] Show permission error page or toast.

- [ ] Handle `419 Session Expired`.
  - [ ] Clear session.
  - [ ] Redirect to login.

---

## 17. Audit Actions

Track these actions:

- [ ] `auth.login`
- [ ] `auth.logout`
- [ ] `auth.password_changed`
- [x] `merchant.created`
- [x] `merchant.updated`
- [ ] `user.invited`
- [ ] `user.removed`
- [ ] `role.updated`
- [x] `product.created`
- [x] `product.updated`
- [x] `product.deleted`
- [x] `product.channel_visibility_updated`
- [x] `inventory.adjusted`
- [x] `inventory.reserved`
- [x] `inventory.released`
- [x] `inventory.confirmed`
- [x] `inventory.expired`
- [x] `theme.draft_updated`
- [x] `theme.draft_reset`
- [x] `theme.published`
- [ ] `order.refunded`
- [ ] `payment.provider_updated`

---

## 18. Security Middleware

- [ ] Add rate limit for login.
- [ ] Add rate limit for forgot password.
- [ ] Add brute-force protection.
- [ ] Add request validation.
- [ ] Add CORS configuration.
- [ ] Add secure HTTP headers.
- [ ] Add request correlation ID.
- [ ] Add IP logging.
- [ ] Add user-agent logging.
- [ ] Sanitize user input.
- [ ] Validate file upload types.
- [ ] Add CSRF protection if using cookies.

---

## 19. Swagger / OpenAPI Documentation

Swagger documentation must be separated by API audience. Documentation separation
is for discoverability only; guards and permission checks must still protect every
private endpoint.

- [ ] Implement the dedicated tasks in
      [`merchant_swagger_todo.md`](./merchant_swagger_todo.md).
- [ ] Publish a user API document at `/docs/user`.
- [ ] Publish a merchant API document at `/docs/merchant`.
- [ ] Publish a platform-admin API document at `/docs/admin`.
- [ ] Keep platform administrators separate from the merchant `admin` role.
- [ ] Verify that endpoints do not leak into the wrong Swagger document.
- [ ] Restrict or disable Swagger documents in production according to environment
      configuration.

---

## 20. Auth Testing

### Backend

- [x] Test register merchant owner.
- [x] Test login success.
- [x] Test login wrong password.
- [ ] Test blocked user cannot login.
- [x] Test refresh token rotation.
- [x] Test logout revokes session.
- [ ] Test expired token is rejected.
- [x] Test user cannot access another merchant data.
- [x] Test permission guard blocks invalid action.
- [ ] Test owner can invite staff.
- [ ] Test staff cannot manage payment provider.
- [x] Test viewer cannot update product.
- [ ] Test audit log is created.

### Frontend

- [ ] Test login form validation.
- [ ] Test protected route redirect.
- [ ] Test logout clears session.
- [ ] Test permission-based UI hiding.
- [ ] Test merchant switcher.
- [ ] Test expired session redirect.
- [ ] Test 403 permission error UI.
