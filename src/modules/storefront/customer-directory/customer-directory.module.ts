import { Module } from '@nestjs/common';
import { CustomerDirectoryService } from './customer-directory.service';

/**
 * Maps a signed-in shopper to the merchant-side `Customer` their orders,
 * addresses and loyalty points hang off.
 *
 * Split out of `StorefrontContextModule`, which resolves a public slug to a
 * merchant — a different question with a different lifetime. They were only
 * ever together because both were "context a storefront request needs".
 */
@Module({
  providers: [CustomerDirectoryService],
  exports: [CustomerDirectoryService],
})
export class CustomerDirectoryModule {}
