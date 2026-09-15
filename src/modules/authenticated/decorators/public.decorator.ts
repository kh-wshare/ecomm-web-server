import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route (or a whole controller) out of `JwtAuthGuard`.
 *
 * It also records `security: []` on the operation so the exported OpenAPI
 * documents say so: without it a public route is indistinguishable from a
 * protected one in the spec, and anything generated from it — Swagger UI, the
 * Postman collections — would claim the route needs a token.
 */
export const Public = () =>
  applyDecorators(SetMetadata(IS_PUBLIC_KEY, true), ApiSecurity({}));
