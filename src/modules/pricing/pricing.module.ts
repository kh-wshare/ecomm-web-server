import { Module } from '@nestjs/common';
import { CartPricingService } from './cart-pricing.service';

@Module({
  providers: [CartPricingService],
  exports: [CartPricingService],
})
export class PricingModule {}
