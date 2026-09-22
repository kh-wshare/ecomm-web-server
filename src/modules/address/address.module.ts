import { Module } from '@nestjs/common';
import { AddressService } from './address.service';

/**
 * The shared address book, used by all three surfaces that write one: the
 * storefront's guest and account books, and the POS customer directory.
 *
 * Same pattern as `pricing/` and `logistics/` — one implementation of the
 * mechanics, imported by whoever needs it, rather than a copy per surface.
 */
@Module({
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
