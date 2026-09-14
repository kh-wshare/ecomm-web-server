import {
  Body,
  Controller,
  Get,
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
import {
  CreateShipmentDto,
  ShipmentQueryDto,
  UpdateShipmentDto,
  UpdateShipmentStatusDto,
} from './dto/shipment-input.dto';
import { ShipmentDto } from './dto/shipment-response.dto';
import { ShipmentsService } from './shipments.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Shipments')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller()
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get('shipments')
  @RequirePermission('shipment.read')
  @ApiOperation({ summary: 'List shipments' })
  @ApiOkResponse({ type: [ShipmentDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: ShipmentQueryDto,
  ) {
    return this.shipments.findAll(merchant.id, query);
  }

  @Get('shipments/:id')
  @RequirePermission('shipment.read')
  @ApiOperation({ summary: 'Get a shipment with its tracking history' })
  @ApiOkResponse({ type: ShipmentDto })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) shipmentId: string,
  ) {
    return this.shipments.findOne(merchant.id, shipmentId);
  }

  @Get('orders/:orderId/shipments')
  @RequirePermission('shipment.read')
  @ApiOperation({ summary: "List an order's shipments" })
  @ApiOkResponse({ type: [ShipmentDto] })
  findForOrder(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.shipments.findForOrder(merchant.id, orderId);
  }

  @Post('orders/:orderId/shipments')
  @RequirePermission('shipment.manage')
  @ApiOperation({
    summary: 'Ship an order, in full or in part',
    description:
      'Omit `items` to ship every unit that is not already covered by a live shipment.',
  })
  @ApiCreatedResponse({ type: ShipmentDto })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiConflictResponse({
    description: 'Order cannot be shipped, or the units are already shipped',
  })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateShipmentDto,
    @Req() request: Request,
  ) {
    return this.shipments.create(
      merchant.id,
      user.id,
      orderId,
      dto,
      this.metadata(request),
    );
  }

  @Patch('shipments/:id')
  @RequirePermission('shipment.manage')
  @ApiOperation({ summary: 'Update a shipment carrier, tracking or address' })
  @ApiOkResponse({ type: ShipmentDto })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiConflictResponse({ description: 'Shipment has reached a final status' })
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Body() dto: UpdateShipmentDto,
    @Req() request: Request,
  ) {
    return this.shipments.update(
      merchant.id,
      user.id,
      shipmentId,
      dto,
      this.metadata(request),
    );
  }

  @Patch('shipments/:id/status')
  @RequirePermission('shipment.manage')
  @ApiOperation({
    summary: 'Advance a shipment and append a tracking event',
    description:
      "Rolls the parent order's fulfillment status up from all of its shipments.",
  })
  @ApiOkResponse({ type: ShipmentDto })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiConflictResponse({ description: 'Status transition is not allowed' })
  updateStatus(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Body() dto: UpdateShipmentStatusDto,
    @Req() request: Request,
  ) {
    return this.shipments.updateStatus(
      merchant.id,
      user.id,
      shipmentId,
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
