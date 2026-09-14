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
import { DeliveryMethodsService } from './delivery-methods.service';
import {
  CreateDeliveryMethodDto,
  CreateDeliveryZoneDto,
  DeliveryMethodQueryDto,
  UpdateDeliveryMethodDto,
  UpdateDeliveryZoneDto,
} from './dto/delivery-method-input.dto';
import {
  DeliveryMethodDto,
  DeliveryZoneDto,
} from './dto/delivery-method-response.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('Delivery Methods')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('delivery-methods')
export class DeliveryMethodsController {
  constructor(private readonly methods: DeliveryMethodsService) {}

  @Get()
  @RequirePermission('delivery.read')
  @ApiOperation({ summary: 'List delivery methods and their zones' })
  @ApiOkResponse({ type: [DeliveryMethodDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: DeliveryMethodQueryDto,
  ) {
    return this.methods.findAll(merchant.id, query);
  }

  @Get(':id')
  @RequirePermission('delivery.read')
  @ApiOperation({ summary: 'Get a delivery method' })
  @ApiOkResponse({ type: DeliveryMethodDto })
  @ApiNotFoundResponse({ description: 'Delivery method not found' })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) methodId: string,
  ) {
    return this.methods.findOne(merchant.id, methodId);
  }

  @Post()
  @RequirePermission('delivery.manage')
  @ApiOperation({ summary: 'Create a delivery method' })
  @ApiCreatedResponse({ type: DeliveryMethodDto })
  @ApiConflictResponse({
    description: 'Delivery method code is already in use',
  })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryMethodDto,
    @Req() request: Request,
  ) {
    return this.methods.create(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Patch(':id')
  @RequirePermission('delivery.manage')
  @ApiOperation({ summary: 'Update a delivery method' })
  @ApiOkResponse({ type: DeliveryMethodDto })
  @ApiNotFoundResponse({ description: 'Delivery method not found' })
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) methodId: string,
    @Body() dto: UpdateDeliveryMethodDto,
    @Req() request: Request,
  ) {
    return this.methods.update(
      merchant.id,
      user.id,
      methodId,
      dto,
      this.metadata(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('delivery.manage')
  @ApiOperation({ summary: 'Archive a delivery method and its zones' })
  @ApiOkResponse({ type: DeliveryMethodDto })
  @ApiNotFoundResponse({ description: 'Delivery method not found' })
  archive(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) methodId: string,
    @Req() request: Request,
  ) {
    return this.methods.archive(
      merchant.id,
      user.id,
      methodId,
      this.metadata(request),
    );
  }

  @Post(':id/zones')
  @RequirePermission('delivery.manage')
  @ApiOperation({ summary: 'Add a priced zone to a delivery method' })
  @ApiCreatedResponse({ type: DeliveryZoneDto })
  @ApiNotFoundResponse({ description: 'Delivery method not found' })
  createZone(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) methodId: string,
    @Body() dto: CreateDeliveryZoneDto,
    @Req() request: Request,
  ) {
    return this.methods.createZone(
      merchant.id,
      user.id,
      methodId,
      dto,
      this.metadata(request),
    );
  }

  @Patch(':id/zones/:zoneId')
  @RequirePermission('delivery.manage')
  @ApiOperation({ summary: 'Update a delivery zone' })
  @ApiOkResponse({ type: DeliveryZoneDto })
  @ApiNotFoundResponse({ description: 'Delivery zone not found' })
  updateZone(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) methodId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Body() dto: UpdateDeliveryZoneDto,
    @Req() request: Request,
  ) {
    return this.methods.updateZone(
      merchant.id,
      user.id,
      methodId,
      zoneId,
      dto,
      this.metadata(request),
    );
  }

  @Delete(':id/zones/:zoneId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('delivery.manage')
  @ApiOperation({ summary: 'Archive a delivery zone' })
  @ApiOkResponse({ type: DeliveryZoneDto })
  @ApiNotFoundResponse({ description: 'Delivery zone not found' })
  archiveZone(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) methodId: string,
    @Param('zoneId', ParseUUIDPipe) zoneId: string,
    @Req() request: Request,
  ) {
    return this.methods.archiveZone(
      merchant.id,
      user.id,
      methodId,
      zoneId,
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
