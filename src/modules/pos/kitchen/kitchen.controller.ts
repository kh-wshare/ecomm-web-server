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
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Idempotent } from '#app/common/decorators/idempotent.decorator';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import {
  KitchenOrderQueryDto,
  UpdateKitchenOrderStatusDto,
} from './dto/kitchen-input.dto';
import { KitchenOrderDto } from './dto/kitchen-response.dto';
import { KitchenService } from './kitchen.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Kitchen')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Post('orders/:orderId/kitchen')
  @Idempotent('pos.order.kitchen_send')
  @RequirePermission('pos.kitchen.send')
  @ApiOperation({ summary: 'Send new/changed order items to the kitchen' })
  @ApiCreatedResponse({ type: KitchenOrderDto })
  sendToKitchen(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Req() request: Request,
  ) {
    return this.kitchen.sendToKitchen(
      merchant.id,
      user.id,
      orderId,
      this.metadata(request),
    );
  }

  @Get('kitchen/orders')
  @RequirePermission('pos.kitchen.send')
  @ApiOperation({ summary: 'List kitchen orders' })
  @ApiOkResponse({ type: [KitchenOrderDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: KitchenOrderQueryDto,
  ) {
    return this.kitchen.findAll(merchant.id, query);
  }

  @Patch('kitchen/orders/:id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pos.kitchen.update')
  @ApiOperation({ summary: 'Advance a kitchen order’s status' })
  @ApiOkResponse({ type: KitchenOrderDto })
  updateStatus(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) kitchenOrderId: string,
    @Body() dto: UpdateKitchenOrderStatusDto,
    @Req() request: Request,
  ) {
    return this.kitchen.updateStatus(
      merchant.id,
      user.id,
      kitchenOrderId,
      dto.status,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return { ipAddress: request.ip, userAgent: request.get('user-agent') };
  }
}
