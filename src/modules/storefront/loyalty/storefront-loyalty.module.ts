import { Module } from '@nestjs/common';
import { CustomerDirectoryModule } from '#app/modules/storefront/customer-directory/customer-directory.module';
import { StorefrontContextModule } from '#app/modules/storefront/context/storefront-context.module';
import { StorefrontLoyaltyController } from './storefront-loyalty.controller';

@Module({
  imports: [CustomerDirectoryModule, StorefrontContextModule],
  controllers: [StorefrontLoyaltyController],
})
export class StorefrontLoyaltyModule {}
