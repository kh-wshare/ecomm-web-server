import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import type { StorefrontMerchant } from './storefront-context.service';
import {
  StorefrontMerchantGuard,
  type StorefrontRequest,
} from './storefront-merchant.guard';

/**
 * The merchant named by `X-Merchant-Slug`, as resolved by
 * `StorefrontMerchantGuard`. Pass a field to get just that value:
 * `@CurrentStorefrontMerchant('id') merchantId: string`.
 */
export const CurrentStorefrontMerchant = createParamDecorator(
  (field: keyof StorefrontMerchant | undefined, ctx: ExecutionContext) => {
    const merchant = ctx
      .switchToHttp()
      .getRequest<StorefrontRequest>().storefrontMerchant;
    // Only reachable when a handler forgets `@StorefrontScoped()`.
    if (!merchant) {
      throw new InternalServerErrorException(
        'Storefront merchant was not resolved for this route',
      );
    }
    return field ? merchant[field] : merchant;
  },
);

/**
 * Scopes a controller or handler to the storefront named by the
 * `X-Merchant-Slug` header, and documents that header in Swagger.
 */
export const StorefrontScoped = () =>
  applyDecorators(
    UseGuards(StorefrontMerchantGuard),
    ApiHeader({
      name: 'X-Merchant-Slug',
      required: true,
      description: 'Slug of the storefront being browsed',
      example: 'acme-store',
    }),
    ApiBadRequestResponse({
      description: 'Missing or malformed X-Merchant-Slug header',
    }),
    ApiNotFoundResponse({ description: 'Storefront not found' }),
  );
