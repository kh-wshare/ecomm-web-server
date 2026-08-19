import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { CreatePaymentIntentDto } from './dto/payment-input.dto';
import { PaymentDto } from './dto/payment-response.dto';
import { PaymentService } from '../../payment/payment.service';

@ApiTags('Payments')
@Controller('payments')
export class StorefrontPaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Public()
  @Post('create-intent')
  @ApiOperation({ summary: 'Create a payment attempt for a checkout order' })
  @ApiCreatedResponse({ type: PaymentDto })
  createIntent(@Body() dto: CreatePaymentIntentDto, @Req() request: Request) {
    return this.payments.createIntent(dto, this.metadata(request));
  }

  @Public()
  @Get(':id/status')
  @ApiHeader({ name: 'X-Checkout-Token', required: true })
  @ApiOperation({
    summary: 'Get payment status for a token-authorized checkout',
  })
  @ApiOkResponse({ type: PaymentDto })
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-checkout-token') token: string | undefined,
  ) {
    return this.payments.findByToken(id, token);
  }

  private metadata(request: Request) {
    return { ipAddress: request.ip, userAgent: request.get('user-agent') };
  }
}
