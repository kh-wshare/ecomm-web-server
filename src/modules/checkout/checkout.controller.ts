import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
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
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/checkout-input.dto';
import {
  CheckoutSessionDto,
  CreatedCheckoutSessionDto,
} from './dto/checkout-response.dto';

@Public()
@ApiTags('Checkout')
@Controller('checkout/session')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post()
  @ApiOperation({ summary: 'Create a checkout and reserve its stock' })
  @ApiCreatedResponse({ type: CreatedCheckoutSessionDto })
  create(@Body() dto: CreateCheckoutSessionDto, @Req() request: Request) {
    return this.checkout.create(dto, this.metadata(request));
  }

  @Get(':id')
  @ApiHeader({ name: 'X-Checkout-Token', required: true })
  @ApiOperation({ summary: 'Get a checkout session' })
  @ApiOkResponse({ type: CheckoutSessionDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-checkout-token') token: string | undefined,
  ) {
    return this.checkout.findOne(id, token);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Checkout-Token', required: true })
  @ApiOperation({ summary: 'Confirm checkout and create an unpaid order' })
  @ApiOkResponse({ type: CheckoutSessionDto })
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-checkout-token') token: string | undefined,
    @Req() request: Request,
  ) {
    return this.checkout.confirm(id, token, this.metadata(request));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Checkout-Token', required: true })
  @ApiOperation({ summary: 'Cancel checkout and release reserved stock' })
  @ApiOkResponse({ type: CheckoutSessionDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-checkout-token') token: string | undefined,
    @Req() request: Request,
  ) {
    return this.checkout.cancel(id, token, this.metadata(request));
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
