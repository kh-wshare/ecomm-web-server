import { Module } from '@nestjs/common';
import { StorefrontContextService } from './storefront-context.service';

@Module({
  providers: [StorefrontContextService],
  exports: [StorefrontContextService],
})
export class StorefrontContextModule {}
