import { Module } from '@nestjs/common';
import { ThemeModule } from '#app/modules/merchant/theme/theme.module';
import { StorefrontContextModule } from './context/storefront-context.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [ThemeModule, StorefrontContextModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
