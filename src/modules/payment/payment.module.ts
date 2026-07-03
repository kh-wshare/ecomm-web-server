import { Module } from '@nestjs/common';
import { NotificationModule } from '#app/modules/notification/notification.module';
import { PaymentController } from './payment.controller';
import { PaymentSecurityService } from './payment-security.service';
import { PaymentService } from './payment.service';

@Module({
  imports: [NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentSecurityService],
  exports: [PaymentService],
})
export class PaymentModule {}
