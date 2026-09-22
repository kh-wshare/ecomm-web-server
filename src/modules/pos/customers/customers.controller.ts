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
  ApiCreatedResponse,
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
import { LoyaltyService } from '#app/modules/loyalty/loyalty.service';
import { PosCustomersService } from './customers.service';
import { CreateCustomerDto, CustomerQueryDto } from './dto/customer-input.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Customers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/customers')
export class PosCustomersController {
  constructor(
    private readonly customers: PosCustomersService,
    private readonly loyalty: LoyaltyService,
  ) {}

  @Get(':customerId/loyalty')
  @RequirePermission('pos.customer.manage')
  @ApiOperation({
    summary: "A customer's points balance and recent movements",
    description:
      'Read-only. Points are earned automatically when an order they placed from an account is paid.',
  })
  @ApiOkResponse()
  loyalty_(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.loyalty.balanceFor(merchant.id, customerId);
  }

  @Get()
  @RequirePermission('pos.customer.manage')
  @ApiOperation({ summary: 'Search POS customers' })
  @ApiOkResponse()
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: CustomerQueryDto,
  ) {
    return this.customers.findAll(merchant.id, query);
  }

  @Post()
  @RequirePermission('pos.customer.manage')
  @ApiOperation({ summary: 'Create a POS customer' })
  @ApiCreatedResponse()
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
    @Req() request: Request,
  ) {
    return this.customers.create(merchant.id, user.id, dto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }
}
