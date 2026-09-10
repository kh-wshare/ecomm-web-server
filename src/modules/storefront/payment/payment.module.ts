import { Module } from '@nestjs/common';

import { NotificationModule } from '@modules/notification/notification.module';
import { StorefrontPaymentController } from './payment.controller';
import { KhqrAdapter } from '@modules/payment/adapters/khqr.adapter';
import { PayWayAdapter } from '@modules/payment/adapters/payway.adapter';
import { PaymentSecurityService } from '@modules/payment/payment-security.service';
import { PaymentService } from '@modules/payment/payment.service';

@Module({
  imports: [NotificationModule],
  controllers: [StorefrontPaymentController],
  providers: [
    PaymentService,
    PaymentSecurityService,
    PayWayAdapter,
    KhqrAdapter,
  ],
  exports: [],
})
export class StorefrontPaymentModule {}
