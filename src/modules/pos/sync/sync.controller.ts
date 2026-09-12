import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { SyncBatchDto } from './dto/sync-input.dto';
import { PosSyncService } from './sync.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Sync')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/sync')
export class PosSyncController {
  constructor(private readonly sync: PosSyncService) {}

  @Get()
  @RequirePermission('pos.sync.read')
  @ApiOperation({
    summary:
      'Cursor-based incremental sync of catalog/inventory/orders/payments',
  })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiOkResponse()
  pull(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query('cursor') cursor?: string,
  ) {
    return this.sync.sync(merchant.id, cursor);
  }

  @Post('batch')
  @RequirePermission('pos.order.create')
  @ApiOperation({ summary: 'Apply a batch of offline-queued operations' })
  @ApiOkResponse()
  batch(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SyncBatchDto,
    @Req() request: Request,
  ) {
    return this.sync.batch(merchant.id, user.id, dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}
