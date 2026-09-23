import { Module } from '@nestjs/common';
import { CheckoutModule } from '#app/modules/checkout/checkout.module';
import { LogisticsModule } from '#app/modules/logistics/logistics.module';
import { PricingModule } from '#app/modules/pricing/pricing.module';
import { StorefrontContextModule } from '#app/modules/storefront/context/storefront-context.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [
    StorefrontContextModule,
    PricingModule,
    LogisticsModule,
    CheckoutModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
