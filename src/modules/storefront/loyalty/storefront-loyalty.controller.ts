import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { LoyaltyService } from '#app/modules/loyalty/loyalty.service';
import {
  CurrentStorefrontMerchant,
  StorefrontScoped,
} from '#app/modules/storefront/context/current-storefront-merchant.decorator';
import { StorefrontContextService } from '#app/modules/storefront/context/storefront-context.service';
import { LoyaltyBalanceDto } from './dto/loyalty-response.dto';

/**
 * The signed-in shopper's own points balance at one merchant.
 *
 * Deliberately not `@Public()`: points belong to an account, and a guest cart
 * token proves only that someone holds a cart. Balances are per-merchant, so
 * the `X-Merchant-Slug` header picks which one.
 */
@ApiTags('Loyalty')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@StorefrontScoped()
@Controller('storefront/loyalty')
export class StorefrontLoyaltyController {
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly context: StorefrontContextService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "The signed-in shopper's points balance and recent movements",
  })
  @ApiOkResponse({ type: LoyaltyBalanceDto })
  async findMine(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user) throw new UnauthorizedException('Sign in to see your points');
    const customerId = await this.context.resolveCustomerForUser(
      merchantId,
      user,
    );
    return this.loyalty.balanceFor(merchantId, customerId);
  }
}
