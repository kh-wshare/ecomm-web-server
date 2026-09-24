import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  StorefrontContextService,
  StorefrontMerchant,
} from './storefront-context.service';

/** The header every storefront request names its merchant in. */
export const MERCHANT_SLUG_HEADER = 'x-merchant-slug';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;

export type StorefrontRequest = Request & {
  storefrontMerchant?: StorefrontMerchant;
};

/**
 * Resolves the `X-Merchant-Slug` header to an active merchant once per request
 * and pins it on the request for `@CurrentStorefrontMerchant()`.
 *
 * A missing or malformed slug is a 400; a well-formed slug that names no
 * active storefront is a 404, exactly as the old `:merchantSlug` path was.
 */
@Injectable()
export class StorefrontMerchantGuard implements CanActivate {
  constructor(private readonly context: StorefrontContextService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<StorefrontRequest>();
    const header = request.headers[MERCHANT_SLUG_HEADER];
    const slug = (Array.isArray(header) ? header[0] : header)
      ?.trim()
      .toLowerCase();

    if (!slug) {
      throw new BadRequestException('X-Merchant-Slug header is required');
    }
    if (slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
      throw new BadRequestException('X-Merchant-Slug header is invalid');
    }

    request.storefrontMerchant = await this.context.resolveMerchant(slug);
    return true;
  }
}
