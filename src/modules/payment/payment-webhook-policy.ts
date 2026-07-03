import {
  PaymentTransactionStatus,
  PaymentWebhookStatus,
} from '#app/generated/prisma/enums';

export function shouldRetryWebhookEvent(status: PaymentWebhookStatus) {
  return status === PaymentWebhookStatus.FAILED;
}

export function isPaymentConfirmationApplied(status: PaymentTransactionStatus) {
  return status === PaymentTransactionStatus.CONFIRMED;
}
