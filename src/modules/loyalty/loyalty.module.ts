import { Global, Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

/**
 * Global because points are granted from wherever an order reaches PAID —
 * the storefront webhook, the POS cash drawer, the KHQR poll — and none of
 * those modules should have to import a loyalty module to stay correct.
 */
@Global()
@Module({
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
