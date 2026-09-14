import { Module } from '@nestjs/common';
import { CartModule } from '#app/modules/storefront/cart/cart.module';
import { StorefrontAddressController } from './address.controller';
import { StorefrontAddressService } from './address.service';

@Module({
  imports: [CartModule],
  controllers: [StorefrontAddressController],
  providers: [StorefrontAddressService],
  exports: [StorefrontAddressService],
})
export class StorefrontAddressModule {}
