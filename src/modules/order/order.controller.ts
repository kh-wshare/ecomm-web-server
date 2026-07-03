import {
  Body,
  Controller,
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
  ApiHeader,
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
import {
  OrderQueryDto,
  RefundOrderDto,
  UpdateOrderStatusDto,
} from './dto/order-input.dto';
import { OrderDto } from './dto/order-response.dto';
import { OrderService } from './order.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Orders')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  @RequirePermission('order.read')
  @ApiOperation({ summary: 'List orders for the active merchant' })
  @ApiOkResponse({ type: [OrderDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: OrderQueryDto,
  ) {
    return this.orders.findAll(merchant.id, query);
  }

  @Get(':id')
  @RequirePermission('order.read')
  @ApiOperation({ summary: 'Get an order from the active merchant' })
  @ApiOkResponse({ type: OrderDto })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.findOne(merchant.id, id);
  }

  @Patch(':id/status')
  @RequirePermission('order.update')
  @ApiOperation({ summary: 'Advance a paid order through fulfillment' })
  @ApiOkResponse({ type: OrderDto })
  updateStatus(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() request: Request,
  ) {
    return this.orders.updateStatus(
      merchant.id,
      id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('order.cancel')
  @ApiOperation({ summary: 'Cancel an unpaid order and release its stock' })
  @ApiOkResponse({ type: OrderDto })
  cancel(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.orders.cancel(merchant.id, id, user.id, this.metadata(request));
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('order.refund')
  @ApiOperation({ summary: 'Refund a paid order with an audited stock policy' })
  @ApiOkResponse({ type: OrderDto })
  refund(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundOrderDto,
    @Req() request: Request,
  ) {
    return this.orders.refund(
      merchant.id,
      id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
