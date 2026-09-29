import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { DashboardService } from './dashboard.service';
import {
  DashboardRangeQueryDto,
  DashboardTopProductsQueryDto,
} from './dto/dashboard-query.dto';
import {
  BalanceResponseDto,
  PayoutsResponseDto,
  RevenueResponseDto,
  SetupResponseDto,
  SummaryResponseDto,
  TopProductsResponseDto,
} from './dto/dashboard-response.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('Dashboard')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('revenue')
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Get revenue and order totals over time' })
  @ApiOkResponse({ type: RevenueResponseDto })
  getRevenue(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: DashboardRangeQueryDto,
  ) {
    return this.dashboard.getRevenue(merchant.id, query);
  }

  @Get('top-products')
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Get best-selling products over time' })
  @ApiOkResponse({ type: TopProductsResponseDto })
  getTopProducts(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: DashboardTopProductsQueryDto,
  ) {
    return this.dashboard.getTopProducts(merchant.id, query);
  }

  @Get('setup')
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Get the merchant onboarding setup checklist' })
  @ApiOkResponse({ type: SetupResponseDto })
  getSetup(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.dashboard.getSetup(merchant.id);
  }

  @Post('setup/dismiss')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Dismiss the onboarding setup checklist banner' })
  dismissSetup(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.dashboard.dismissSetup(merchant.id);
  }

  @Post('setup/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('dashboard.read')
  @ApiOperation({
    summary: 'Restore a dismissed onboarding setup checklist banner',
  })
  restoreSetup(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.dashboard.restoreSetup(merchant.id);
  }

  @Get('setup/qr.svg')
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Get a QR code (SVG) linking to the storefront' })
  @ApiProduces('image/svg+xml')
  async getSetupQrCode(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Res() response: Response,
  ) {
    const target = await this.dashboard.getStorefrontQrTarget(merchant.id);
    const svg = await QRCode.toString(target, { type: 'svg' });
    response.type('image/svg+xml').send(svg);
  }

  @Get('balance')
  @RequirePermission('payout.read')
  @ApiOperation({ summary: 'Get available and pending balance' })
  @ApiOkResponse({ type: BalanceResponseDto })
  getBalance(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.dashboard.getBalance(merchant.id);
  }

  @Get('payouts')
  @RequirePermission('payout.read')
  @ApiOperation({
    summary: 'Get available balance, pending balance, and next payout',
  })
  @ApiOkResponse({ type: PayoutsResponseDto })
  getPayouts(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.dashboard.getPayouts(merchant.id);
  }

  @Get('summary')
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Get the top-of-dashboard KPI summary' })
  @ApiOkResponse({ type: SummaryResponseDto })
  getSummary(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: DashboardRangeQueryDto,
  ) {
    return this.dashboard.getSummary(merchant.id, query);
  }
}
