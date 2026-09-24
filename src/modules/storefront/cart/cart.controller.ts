import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '#app/modules/authenticated/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { CheckoutSessionDto } from '#app/modules/checkout/dto/checkout-response.dto';
import { DeliveryOptionDto } from '#app/modules/logistics/dto/delivery-method-response.dto';
import {
  CurrentStorefrontMerchant,
  StorefrontScoped,
} from '#app/modules/storefront/context/current-storefront-merchant.decorator';
import type { StorefrontMerchant } from '#app/modules/storefront/context/storefront-context.service';
import { CartService } from './cart.service';
import {
  CartItemInputDto,
  CheckoutCartDto,
  CreateCartDto,
  SelectCartDeliveryDto,
  UpdateCartContactDto,
  UpdateCartItemDto,
} from './dto/cart-input.dto';
import { CartDto, CreatedCartDto } from './dto/cart-response.dto';

@Public()
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Cart')
@ApiUnauthorizedResponse({ description: 'Missing or invalid cart token' })
@StorefrontScoped()
@Controller('storefront/cart')
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a cart',
    description:
      'Returns a one-time cart token. No shopper account is involved — whoever holds the token holds the cart.',
  })
  @ApiCreatedResponse({ type: CreatedCartDto })
  create(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Body() dto: CreateCartDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.create(merchantId, dto, user);
  }

  @Get('mine')
  @ApiOperation({
    summary: "The signed-in shopper's current cart",
    description:
      'The one cart lookup that needs no X-Cart-Token, so a shopper who signs in on a new device can pick up where they left off. Requires a bearer token.',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'No active cart for this account' })
  findMine(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) throw new UnauthorizedException('Sign in to load your cart');
    return this.carts.findMine(merchantId, user);
  }

  @Get(':cartId')
  @ApiOperation({
    summary: 'Get a cart, re-priced at current catalog prices',
    description:
      'Accepts either the X-Cart-Token or a bearer token for the shopper who owns the cart.',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  findOne(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.findOne(merchantId, cartId, token, user);
  }

  @Post(':cartId/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add an item, merging onto the matching line if present',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiConflictResponse({ description: 'Product is not purchasable here' })
  addItem(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CartItemInputDto,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.addItem(merchantId, cartId, token, dto, user);
  }

  @Patch(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Set a line quantity; zero removes the line' })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  updateItem(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.updateItem(merchantId, cartId, token, itemId, dto, user);
  }

  @Delete(':cartId/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a line' })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  removeItem(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.removeItem(merchantId, cartId, token, itemId, user);
  }

  @Delete(':cartId/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Empty the cart' })
  @ApiOkResponse({ type: CartDto })
  clear(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.clear(merchantId, cartId, token, user);
  }

  @Patch(':cartId/contact')
  @ApiOperation({ summary: 'Set the shopper name, email, phone or order note' })
  @ApiOkResponse({ type: CartDto })
  updateContact(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: UpdateCartContactDto,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.updateContact(merchantId, cartId, token, dto, user);
  }

  @Get(':cartId/delivery-options')
  @ApiOperation({
    summary: 'Delivery options priced for this cart and its shipping address',
  })
  @ApiOkResponse({ type: [DeliveryOptionDto] })
  deliveryOptions(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.deliveryOptions(merchantId, cartId, token, user);
  }

  @Patch(':cartId/delivery')
  @ApiOperation({ summary: 'Choose a delivery method for this cart' })
  @ApiOkResponse({ type: CartDto })
  @ApiConflictResponse({
    description: 'Method is not available for this cart or address',
  })
  selectDelivery(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: SelectCartDeliveryDto,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.selectDelivery(merchantId, cartId, token, dto, user);
  }

  @Post(':cartId/checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Convert the cart into a checkout session and reserve stock',
    description:
      'Returns a checkout session plus its X-Checkout-Token; the cart is then CONVERTED.',
  })
  @ApiCreatedResponse({ type: CheckoutSessionDto })
  @ApiConflictResponse({
    description:
      'Cart is empty, has no contact details, or its delivery selection is no longer valid',
  })
  checkout(
    @CurrentStorefrontMerchant() merchant: StorefrontMerchant,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CheckoutCartDto,
    @Req() request: Request,
    @Headers('X-Cart-Token') token?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.carts.checkoutCart(
      merchant,
      cartId,
      token,
      dto,
      { ipAddress: request.ip, userAgent: request.get('user-agent') },
      user,
    );
  }
}
