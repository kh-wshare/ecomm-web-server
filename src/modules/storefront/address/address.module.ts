import { Module } from '@nestjs/common';
import { AddressModule } from '#app/modules/address/address.module';
import { CartModule } from '#app/modules/storefront/cart/cart.module';
import { StorefrontContextModule } from '#app/modules/storefront/context/storefront-context.module';
import { CustomerDirectoryModule } from '#app/modules/storefront/customer-directory/customer-directory.module';
import { StorefrontAddressController } from './address.controller';
import { StorefrontAddressService } from './address.service';
import { GuestAddressController } from './guest/guest-address.controller';
import { GuestAddressService } from './guest/guest-address.service';

/**
 * Two access policies over the one address book in `AddressModule`:
 *
 * - the module root — the signed-in shopper's own book, keyed on their user
 *   id, with no cart anywhere. This is the ordinary case, so it gets the
 *   unprefixed `address.*` files.
 * - `guest/` — the special case: no account, so a cart token is the only
 *   identity and everything hangs off that cart.
 *
 * They share storage and mechanics but nothing else; the split is by *who is
 * allowed to see what*, which is the only thing that actually differs.
 */
@Module({
  imports: [
    AddressModule,
    CartModule,
    CustomerDirectoryModule,
    StorefrontContextModule,
  ],
  controllers: [StorefrontAddressController, GuestAddressController],
  providers: [StorefrontAddressService, GuestAddressService],
  exports: [StorefrontAddressService, GuestAddressService],
})
export class StorefrontAddressModule {}
