import { Module } from '@nestjs/common';
import { LogisticsModule } from '#app/modules/logistics/logistics.module';
import { StorefrontContextModule } from '#app/modules/storefront/context/storefront-context.module';
import { StorefrontDeliveryController } from './storefront-delivery.controller';
import { StorefrontDeliveryService } from './storefront-delivery.service';

@Module({
  imports: [LogisticsModule, StorefrontContextModule],
  controllers: [StorefrontDeliveryController],
  providers: [StorefrontDeliveryService],
})
export class StorefrontDeliveryModule {}
