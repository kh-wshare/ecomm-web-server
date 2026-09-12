import { Module } from '@nestjs/common';
import { OrderModule } from '#app/modules/order/order.module';
import { PaymentModule } from '#app/modules/payment/payment.module';
import { PosPaymentsController } from './pos-payments.controller';
import { PosPaymentsService } from './pos-payments.service';

@Module({
  imports: [PaymentModule, OrderModule],
  controllers: [PosPaymentsController],
  providers: [PosPaymentsService],
  exports: [PosPaymentsService],
})
export class PosPaymentsModule {}
