import { Module } from '@nestjs/common';
import { DeliveryMethodsController } from './delivery-methods.controller';
import { DeliveryMethodsService } from './delivery-methods.service';
import { DeliveryQuoteService } from './delivery-quote.service';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

/**
 * Shared between the merchant dashboard and the storefront, the same way
 * `order/` and `payment/` are: the merchant configures delivery methods and
 * ships orders here, while `storefront/delivery` and `storefront/cart` reuse
 * `DeliveryQuoteService` and `ShipmentsService` to quote and track without a
 * second implementation.
 */
@Module({
  controllers: [DeliveryMethodsController, ShipmentsController],
  providers: [DeliveryMethodsService, DeliveryQuoteService, ShipmentsService],
  exports: [DeliveryMethodsService, DeliveryQuoteService, ShipmentsService],
})
export class LogisticsModule {}
