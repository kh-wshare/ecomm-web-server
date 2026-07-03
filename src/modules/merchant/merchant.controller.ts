import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiHeader,
  ApiCreatedResponse,
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
import { MerchantDashboardDto, MerchantDto } from './dto/merchant-response.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { MerchantService } from './merchant.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';

type CurrentMerchantContext = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
};

@ApiTags('Merchant')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@Controller()
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post('merchants')
  @ApiOperation({ summary: 'Create another merchant for the current account' })
  @ApiCreatedResponse({ type: MerchantDto })
  create(
    @Body() dto: CreateMerchantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.merchantService.create(user.id, dto, this.metadata(request));
  }

  @Get('merchant')
  @RequireMerchant()
  @RequirePermission('merchant.read')
  @ApiOperation({ summary: 'Get the active merchant profile' })
  @ApiOkResponse({ type: MerchantDto })
  findCurrent(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.merchantService.findCurrent(merchant.id);
  }

  @Patch('merchant')
  @HttpCode(HttpStatus.OK)
  @RequireMerchant()
  @RequirePermission('merchant.update')
  @ApiOperation({ summary: 'Update the active merchant profile' })
  @ApiOkResponse({ type: MerchantDto })
  @ApiConflictResponse({ description: 'Merchant slug is already in use' })
  updateCurrent(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMerchantDto,
    @Req() request: Request,
  ) {
    return this.merchantService.updateCurrent(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Get('merchant/dashboard')
  @RequireMerchant()
  @RequirePermission('dashboard.read')
  @ApiOperation({ summary: 'Get the active merchant dashboard summary' })
  @ApiOkResponse({ type: MerchantDashboardDto })
  dashboard(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.merchantService.dashboard(merchant.id);
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
