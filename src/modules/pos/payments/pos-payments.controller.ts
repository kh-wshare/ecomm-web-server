import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { Idempotent } from '#app/common/decorators/idempotent.decorator';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import {
  CreatePosPaymentDto,
  CreatePosRefundDto,
} from './dto/pos-payment-input.dto';
import { PosPaymentsService } from './pos-payments.service';

type CurrentMerchantContext = { id: string };

@ApiTags('POS Payments')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('pos')
export class PosPaymentsController {
  constructor(private readonly payments: PosPaymentsService) {}

  @Post('orders/:orderId/payments')
  @Idempotent('pos.payment.create')
  @RequirePermission('pos.payment.create')
  @ApiOperation({ summary: 'Take a payment (cash or KHQR) against an order' })
  @ApiCreatedResponse()
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreatePosPaymentDto,
    @Req() request: Request,
  ) {
    return this.payments.create(
      merchant.id,
      user.id,
      orderId,
      dto,
      this.metadata(request),
    );
  }

  @Get('payments/:paymentId')
  @RequirePermission('pos.payment.create')
  @ApiOperation({
    summary: 'Get payment status (polls KHQR provider if still pending)',
  })
  @ApiOkResponse()
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.payments.findOne(merchant.id, paymentId);
  }

  @Post('payments/:paymentId/refund')
  @HttpCode(HttpStatus.OK)
  @Idempotent('pos.payment.refund')
  @RequirePermission('pos.payment.refund')
  @ApiOperation({ summary: 'Refund all or part of a confirmed payment' })
  @ApiOkResponse()
  refund(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: CreatePosRefundDto,
    @Req() request: Request,
  ) {
    return this.payments.refund(
      merchant.id,
      user.id,
      paymentId,
      dto,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return { ipAddress: request.ip, userAgent: request.get('user-agent') };
  }
}
