import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
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
import { PosCustomersService } from './customers.service';
import { CreateCustomerDto, CustomerQueryDto } from './dto/customer-input.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Customers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos/customers')
export class PosCustomersController {
  constructor(private readonly customers: PosCustomersService) {}

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
