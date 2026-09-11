import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_SCOPE_KEY = 'idempotentScope';

/**
 * Marks a mutation endpoint as requiring an `Idempotency-Key` header.
 * `scope` namespaces the key so the same raw key value from a device can be
 * reused across different endpoints (e.g. order create vs kitchen submit)
 * without colliding, mirroring `@RequirePermission`'s SetMetadata pattern.
 */
export const Idempotent = (scope: string) =>
  SetMetadata(IDEMPOTENT_SCOPE_KEY, scope);
