import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { CreatePosSaleDto } from './dto/pos-sale-input.dto';
import { PosSaleResponseDto } from './dto/pos-sale-response.dto';
import { PosService } from './pos.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos')
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('bootstrap')
  @RequirePermission('pos.access')
  @ApiOperation({
    summary: 'Aggregate payload for the POS app’s initial local sync',
  })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiOkResponse()
  bootstrap(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.pos.bootstrap(merchant.id, user, deviceId);
  }

  @Post('sales')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('pos.sale.create')
  @ApiOperation({ summary: 'Complete a POS sale and return a receipt' })
  @ApiCreatedResponse({ type: PosSaleResponseDto })
  createSale(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePosSaleDto,
    @Req() request: Request,
  ) {
    return this.pos.createSale(
      merchant.id,
      user.id,
      user.fullName,
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
