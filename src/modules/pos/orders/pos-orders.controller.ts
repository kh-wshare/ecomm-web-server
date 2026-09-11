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
  AssignPosOrderTableDto,
  CancelPosOrderDto,
  CreatePosOrderDto,
  PosOrderQueryDto,
  UpdatePosOrderDto,
} from './dto/pos-order-input.dto';
import { PosOrderDto } from './dto/pos-order-response.dto';
import { PosOrdersService } from './pos-orders.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Orders')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/orders')
export class PosOrdersController {
  constructor(private readonly ordersService: PosOrdersService) {}

  @Post()
  @Idempotent('pos.order.create')
  @RequirePermission('pos.order.create')
  @ApiOperation({ summary: 'Create a POS order' })
  @ApiCreatedResponse({ type: PosOrderDto })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePosOrderDto,
    @Req() request: Request,
  ) {
    return this.ordersService.create(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Get()
  @RequirePermission('pos.order.create')
  @ApiOperation({ summary: 'List POS orders' })
  @ApiOkResponse({ type: [PosOrderDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: PosOrderQueryDto,
  ) {
    return this.ordersService.findAll(merchant.id, query);
  }

  @Get(':orderId')
  @RequirePermission('pos.order.create')
  @ApiOperation({ summary: 'Get POS order detail' })
  @ApiOkResponse({ type: PosOrderDto })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.findOne(merchant.id, orderId);
  }

  @Patch(':orderId')
  @Idempotent('pos.order.update')
  @RequirePermission('pos.order.update')
  @ApiOperation({ summary: 'Modify a POS order’s items' })
  @ApiOkResponse({ type: PosOrderDto })
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdatePosOrderDto,
    @Req() request: Request,
  ) {
    return this.ordersService.update(
      merchant.id,
      user.id,
      orderId,
      dto,
      this.metadata(request),
    );
  }

  @Post(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  @Idempotent('pos.order.cancel')
  @RequirePermission('pos.order.cancel')
  @ApiOperation({ summary: 'Cancel a POS order' })
  @ApiOkResponse({ type: PosOrderDto })
  cancel(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CancelPosOrderDto,
    @Req() request: Request,
  ) {
    return this.ordersService.cancel(
      merchant.id,
      user.id,
      orderId,
      dto,
      this.metadata(request),
    );
  }

  @Post(':orderId/table')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('pos.table.manage')
  @ApiOperation({ summary: 'Assign a POS order to a table' })
  @ApiOkResponse({ type: PosOrderDto })
  assignTable(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AssignPosOrderTableDto,
    @Req() request: Request,
  ) {
    return this.ordersService.assignTable(
      merchant.id,
      user.id,
      orderId,
      dto.tableId,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return { ipAddress: request.ip, userAgent: request.get('user-agent') };
  }
}
