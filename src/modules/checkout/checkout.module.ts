import { Module } from '@nestjs/common';
import { InventoryModule } from '#app/modules/inventory/inventory.module';
import { LogisticsModule } from '#app/modules/logistics/logistics.module';
import { OrderModule } from '#app/modules/order/order.module';
import { PricingModule } from '#app/modules/pricing/pricing.module';
import { StorefrontContextModule } from '#app/modules/storefront/context/storefront-context.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [
    InventoryModule,
    OrderModule,
    PricingModule,
    LogisticsModule,
    StorefrontContextModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
