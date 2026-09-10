import { Module } from '@nestjs/common';
import { NotificationModule } from '@/modules/notification/notification.module';
import { PaymentController } from './payment.controller';
import { PaymentSecurityService } from './payment-security.service';
import { PaymentService } from './payment.service';
import { PayWayAdapter } from './adapters/payway.adapter';
import { KhqrAdapter } from './adapters/khqr.adapter';

@Module({
  imports: [NotificationModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentSecurityService,
    PayWayAdapter,
    KhqrAdapter,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
