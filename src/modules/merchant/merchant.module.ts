import { Module } from '@nestjs/common';
import { AuthorizationModule } from '#app/modules/authorization/authorization.module';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}
