import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { PaymentProviderCode } from '#app/generated/prisma/enums';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { PaymentService } from '#app/modules/payment/payment.service';
import { PaymentWebhookDto } from './dto/payment-webhook-resp.dto';
import { PaymentWebhookRespDto } from './dto/payement-webhook.dto';

@ApiTags('Payment Webhooks')
@Controller('payments/webhook')
export class PaymentWebhookController {
  constructor(private readonly payments: PaymentService) {}

  @Public()
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive and verify an ABA PayWay callback' })
  paywayCallback(
    @Body() payload: Record<string, unknown>,
    @Headers('x-payment-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.payments.handlePayWayCallback(
      payload,
      request.rawBody ?? Buffer.from(JSON.stringify(payload), 'utf8'),
      signature,
      this.metadata(request),
    );
  }

  @Public()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Payment-Signature', required: true })
  @ApiOperation({ summary: 'Process a signed provider webhook' })
  @ApiOkResponse({ type: PaymentWebhookRespDto })
  webhook(
    @Param('provider', new ParseEnumPipe(PaymentProviderCode))
    provider: PaymentProviderCode,
    @Body() dto: PaymentWebhookDto,
    @Headers('x-payment-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.payments.handleWebhook(
      provider,
      dto,
      request.rawBody ?? Buffer.from(JSON.stringify(dto), 'utf8'),
      signature,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return { ipAddress: request.ip, userAgent: request.get('user-agent') };
  }
}
