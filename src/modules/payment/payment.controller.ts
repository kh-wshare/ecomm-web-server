import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseEnumPipe,
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
import { PaymentProviderCode } from '#app/generated/prisma/enums';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import {
  ConnectPaymentProviderDto,
  PaymentQueryDto,
} from './dto/payment-input.dto';
import { PaymentDto, PaymentProviderDto } from './dto/payment-response.dto';
import { PaymentService } from './payment.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post('providers')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Merchant-ID', required: false })
  @RequireMerchant()
  @RequirePermission('payment.provider_manage')
  @ApiOperation({ summary: 'Connect or rotate a payment provider' })
  @ApiCreatedResponse({ type: PaymentProviderDto })
  connectProvider(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectPaymentProviderDto,
    @Req() request: Request,
  ) {
    return this.payments.connectProvider(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Get('providers')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Merchant-ID', required: false })
  @RequireMerchant()
  @RequirePermission('payment.provider_manage')
  @ApiOperation({ summary: 'List payment providers for the active merchant' })
  @ApiOkResponse({ type: [PaymentProviderDto] })
  listProviders(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.payments.listProviders(merchant.id);
  }

  @Patch('providers/:provider/disconnect')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Merchant-ID', required: false })
  @RequireMerchant()
  @RequirePermission('payment.provider_manage')
  @ApiOperation({ summary: 'Disconnect a payment provider' })
  @ApiOkResponse({ type: PaymentProviderDto })
  disconnectProvider(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider', new ParseEnumPipe(PaymentProviderCode))
    provider: PaymentProviderCode,
    @Req() request: Request,
  ) {
    return this.payments.disconnectProvider(
      merchant.id,
      user.id,
      provider,
      this.metadata(request),
    );
  }

  @Get('transactions')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Merchant-ID', required: false })
  @RequireMerchant()
  @RequirePermission('payment.read')
  @ApiOperation({ summary: 'List payments for the active merchant' })
  @ApiOkResponse({ type: [PaymentDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: PaymentQueryDto,
  ) {
    return this.payments.findAll(merchant.id, query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Merchant-ID', required: false })
  @RequireMerchant()
  @RequirePermission('payment.read')
  @ApiOperation({ summary: 'Get a payment from the active merchant' })
  @ApiOkResponse({ type: PaymentDto })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.findOne(merchant.id, id);
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
