import { Module } from '@nestjs/common';
import { NotificationModule } from '#app/modules/notification/notification.module';
import { KhqrAdapter } from '@modules/payment/adapters/khqr.adapter';
import { PayWayAdapter } from '@modules/payment/adapters/payway.adapter';
import { PaymentSecurityService } from '@modules/payment/payment-security.service';
import { PaymentService } from '@modules/payment/payment.service';
import { PaymentWebhookController } from './payment-webhook.controller';

@Module({
  imports: [NotificationModule],
  controllers: [
    PaymentWebhookController,
  ],
  providers: [
    PaymentService,
    PaymentSecurityService,
    PayWayAdapter,
    KhqrAdapter,
  ],
  exports: [],
})
export class StorefrontPaymentWebhookModule {}
