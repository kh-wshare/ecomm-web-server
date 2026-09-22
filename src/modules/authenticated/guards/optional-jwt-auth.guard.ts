import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Populates `request.user` when a valid bearer token is supplied, and lets the
 * request through untouched when it isn't.
 *
 * For surfaces that serve both signed-in and anonymous callers — the storefront
 * cart, where a shopper may browse as a guest and log in partway through.
 * `JwtAuthGuard` would reject the anonymous half; this one treats identity as
 * optional rather than required, so authorization decisions stay in the
 * services that know what an absent user means.
 *
 * Removing it from a `@Public()` controller does not fail loudly: the global
 * `JwtAuthGuard` skips public routes, so `@CurrentUser()` silently becomes
 * `undefined` everywhere and every signed-in behaviour (cart binding, the
 * guest-cart merge, `GET /cart/mine`) stops working.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser): TUser | null {
    return user || null;
  }
}
