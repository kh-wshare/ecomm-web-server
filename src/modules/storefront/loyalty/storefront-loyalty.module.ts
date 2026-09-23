import { Module } from '@nestjs/common';
import { StorefrontContextModule } from '#app/modules/storefront/context/storefront-context.module';
import { StorefrontLoyaltyController } from './storefront-loyalty.controller';

@Module({
  imports: [StorefrontContextModule],
  controllers: [StorefrontLoyaltyController],
})
export class StorefrontLoyaltyModule {}
