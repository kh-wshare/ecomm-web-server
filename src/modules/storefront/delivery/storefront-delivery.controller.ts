import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { DeliveryOptionDto } from '#app/modules/logistics/dto/delivery-method-response.dto';
import {
  QuoteDeliveryDto,
  TrackOrderQueryDto,
} from './dto/storefront-delivery.dto';
import { StorefrontDeliveryService } from './storefront-delivery.service';

@Public()
@ApiTags('Storefront Delivery')
@Controller('storefront/:merchantSlug')
export class StorefrontDeliveryController {
  constructor(private readonly delivery: StorefrontDeliveryService) {}

  @Get('delivery-options')
  @ApiOperation({
    summary: 'Quote delivery options for a destination',
    description:
      'For a shipping calculator before a cart exists. With no address, only pickup methods can be priced.',
  })
  @ApiOkResponse({ type: [DeliveryOptionDto] })
  quote(
    @Param('merchantSlug') merchantSlug: string,
    @Query() query: QuoteDeliveryDto,
  ) {
    return this.delivery.quote(merchantSlug, query);
  }

  @Get('orders/:orderNumber/tracking')
  @ApiOperation({
    summary: 'Track an order, verified against the customer email',
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  track(
    @Param('merchantSlug') merchantSlug: string,
    @Param('orderNumber') orderNumber: string,
    @Query() query: TrackOrderQueryDto,
  ) {
    return this.delivery.trackOrder(
      merchantSlug,
      orderNumber,
      query.customerEmail,
    );
  }
}
