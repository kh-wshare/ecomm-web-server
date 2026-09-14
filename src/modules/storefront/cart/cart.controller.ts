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
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { CheckoutSessionDto } from '#app/modules/checkout/dto/checkout-response.dto';
import { DeliveryOptionDto } from '#app/modules/logistics/dto/delivery-method-response.dto';
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
@ApiTags('Storefront Cart')
@ApiHeader({
  name: 'X-Cart-Token',
  required: true,
  description: 'The token returned when the cart was created',
})
@ApiUnauthorizedResponse({ description: 'Missing or invalid cart token' })
@Controller('storefront/:merchantSlug/cart')
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Post()
  @ApiHeader({ name: 'X-Cart-Token', required: false })
  @ApiOperation({
    summary: 'Create a cart',
    description:
      'Returns a one-time cart token. No shopper account is involved — whoever holds the token holds the cart.',
  })
  @ApiCreatedResponse({ type: CreatedCartDto })
  create(
    @Param('merchantSlug') merchantSlug: string,
    @Body() dto: CreateCartDto,
  ) {
    return this.carts.create(merchantSlug, dto);
  }

  @Get(':cartId')
  @ApiOperation({
    summary: 'Get a cart, re-priced at current catalog prices',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  findOne(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.findOne(merchantSlug, cartId, token);
  }

  @Post(':cartId/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add an item, merging onto the matching line if present',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiConflictResponse({ description: 'Product is not purchasable here' })
  addItem(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CartItemInputDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.addItem(merchantSlug, cartId, token, dto);
  }

  @Patch(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Set a line quantity; zero removes the line' })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  updateItem(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.updateItem(merchantSlug, cartId, token, itemId, dto);
  }

  @Delete(':cartId/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a line' })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  removeItem(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.removeItem(merchantSlug, cartId, token, itemId);
  }

  @Delete(':cartId/items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Empty the cart' })
  @ApiOkResponse({ type: CartDto })
  clear(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.clear(merchantSlug, cartId, token);
  }

  @Patch(':cartId/contact')
  @ApiOperation({ summary: 'Set the shopper name, email, phone or order note' })
  @ApiOkResponse({ type: CartDto })
  updateContact(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: UpdateCartContactDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.updateContact(merchantSlug, cartId, token, dto);
  }

  @Get(':cartId/delivery-options')
  @ApiOperation({
    summary: 'Delivery options priced for this cart and its shipping address',
  })
  @ApiOkResponse({ type: [DeliveryOptionDto] })
  deliveryOptions(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.deliveryOptions(merchantSlug, cartId, token);
  }

  @Patch(':cartId/delivery')
  @ApiOperation({ summary: 'Choose a delivery method for this cart' })
  @ApiOkResponse({ type: CartDto })
  @ApiConflictResponse({
    description: 'Method is not available for this cart or address',
  })
  selectDelivery(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: SelectCartDeliveryDto,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.selectDelivery(merchantSlug, cartId, token, dto);
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
    description: 'Cart is empty, or its delivery selection is no longer valid',
  })
  checkout(
    @Param('merchantSlug') merchantSlug: string,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CheckoutCartDto,
    @Req() request: Request,
    @Headers('x-cart-token') token?: string,
  ) {
    return this.carts.checkoutCart(merchantSlug, cartId, token, dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}
