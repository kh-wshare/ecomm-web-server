import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  AdjustInventoryDto,
  ConfirmInventoryDto,
  ReleaseInventoryDto,
  ReserveInventoryDto,
} from './dto/inventory-input.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import {
  InventoryOperationDto,
  InventoryStockDto,
  ProductInventoryDetailDto,
} from './dto/inventory-response.dto';
import { InventoryService } from './inventory.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Inventory')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'List inventory for the active merchant' })
  @ApiOkResponse({ type: [InventoryStockDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: InventoryQueryDto,
  ) {
    return this.inventoryService.findAll(merchant.id, query);
  }

  @Get(':productId')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Get stock detail for a merchant product' })
  @ApiOkResponse({ type: ProductInventoryDetailDto })
  findProduct(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.inventoryService.findProduct(merchant.id, productId);
  }

  @Post('adjust')
  @RequirePermission('inventory.adjust')
  @ApiOperation({ summary: 'Apply a signed manual stock adjustment' })
  @ApiOkResponse({ type: InventoryStockDto })
  adjust(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdjustInventoryDto,
    @Req() request: Request,
  ) {
    return this.inventoryService.adjust(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Post('reserve')
  @RequirePermission('inventory.adjust')
  @ApiOperation({ summary: 'Reserve stock for a checkout session' })
  @ApiOkResponse({ type: InventoryOperationDto })
  reserve(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReserveInventoryDto,
    @Req() request: Request,
  ) {
    return this.inventoryService.reserve(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Post('release')
  @RequirePermission('inventory.adjust')
  @ApiOperation({ summary: 'Release an active stock reservation' })
  @ApiOkResponse({ type: InventoryOperationDto })
  release(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReleaseInventoryDto,
    @Req() request: Request,
  ) {
    return this.inventoryService.release(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Post('confirm')
  @RequirePermission('inventory.adjust')
  @ApiOperation({ summary: 'Confirm reserved stock after payment' })
  @ApiOkResponse({ type: InventoryOperationDto })
  confirm(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmInventoryDto,
    @Req() request: Request,
  ) {
    return this.inventoryService.confirm(
      merchant.id,
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
