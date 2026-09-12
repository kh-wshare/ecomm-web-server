import { Module } from '@nestjs/common';
import { ThemeModule } from '#app/modules/merchant/theme/theme.module';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [ThemeModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
