import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { CartDto } from '#app/modules/storefront/cart/dto/cart-response.dto';
import {
  CartItemInputDto,
  UpdateCartItemDto,
} from '#app/modules/storefront/cart/dto/cart-input.dto';
import {
  CheckoutPosCartDto,
  CreatePosCartDto,
  UpdatePosCartContactDto,
} from './dto/pos-cart-input.dto';
import { PosCartQueryDto } from './dto/pos-cart-query.dto';
import { PosCartsService } from './pos-carts.service';

type CurrentMerchantContext = { id: string };

/**
 * Staff-built carts for assisted (phone/walk-in) orders.
 *
 * Authorized by merchant scope plus a POS permission — never by the cart
 * token, which is issued once at creation and cannot be read back.
 */
@ApiTags('POS Carts')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos')
export class PosCartsController {
  constructor(private readonly carts: PosCartsService) {}

  @Post('customers/:customerId/carts')
  @RequirePermission('pos.order.create')
  @ApiOperation({
    summary: 'Build a cart for a customer (an assisted phone/walk-in order)',
  })
  @ApiCreatedResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreatePosCartDto,
  ) {
    return this.carts.create(merchant.id, customerId, user.id, dto);
  }

  @Get('carts')
  @RequirePermission('pos.order.create')
  @ApiOperation({
    summary: 'List carts built by the current staff member',
    description:
      'Scoped to the authenticated staff user; there is no creator filter.',
  })
  @ApiOkResponse()
  findAllByCreator(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PosCartQueryDto,
  ) {
    return this.carts.findAllByCreator(merchant.id, user.id, query);
  }

  @Get('carts/:cartId')
  @RequirePermission('pos.order.create')
  @ApiOperation({
    summary: 'Get one staff-built cart, re-priced at current POS prices',
    description:
      'Any staff member in the merchant may open it, so a colleague can pick up a phone order mid-call.',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart not found' })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('cartId', ParseUUIDPipe) cartId: string,
  ) {
    return this.carts.findOne(merchant.id, cartId);
  }

  @Post('carts/:cartId/items')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pos.order.create')
  @ApiOperation({
    summary: 'Add an item, merging onto the matching line if present',
  })
  @ApiOkResponse({ type: CartDto })
  @ApiConflictResponse({ description: 'Product is not purchasable here' })
  addItem(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CartItemInputDto,
  ) {
    return this.carts.addItem(merchant.id, cartId, dto);
  }

  @Patch('carts/:cartId/items/:itemId')
  @RequirePermission('pos.order.create')
  @ApiOperation({ summary: 'Set a line quantity; zero removes the line' })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  updateItem(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.carts.updateItem(merchant.id, cartId, itemId, dto);
  }

  @Delete('carts/:cartId/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pos.order.create')
  @ApiOperation({ summary: 'Remove a line' })
  @ApiOkResponse({ type: CartDto })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  removeItem(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.carts.removeItem(merchant.id, cartId, itemId);
  }

  @Delete('carts/:cartId/items')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pos.order.create')
  @ApiOperation({ summary: 'Empty the cart' })
  @ApiOkResponse({ type: CartDto })
  clear(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('cartId', ParseUUIDPipe) cartId: string,
  ) {
    return this.carts.clear(merchant.id, cartId);
  }

  @Patch('carts/:cartId/contact')
  @RequirePermission('pos.order.create')
  @ApiOperation({
    summary: 'Set the name, phone or note carried onto the order',
  })
  @ApiOkResponse({ type: CartDto })
  updateContact(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: UpdatePosCartContactDto,
  ) {
    return this.carts.updateContact(merchant.id, cartId, dto);
  }

  @Post('carts/:cartId/checkout')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('pos.order.create')
  @ApiOperation({
    summary: 'Ring the cart up as a POS order',
    description:
      'Creates a POS order on the given register and reserves stock; the cart is then CONVERTED.',
  })
  @ApiCreatedResponse()
  @ApiConflictResponse({ description: 'Cart is empty, converted or expired' })
  checkout(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() dto: CheckoutPosCartDto,
    @Req() request: Request,
  ) {
    return this.carts.checkout(merchant.id, user.id, cartId, dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}
