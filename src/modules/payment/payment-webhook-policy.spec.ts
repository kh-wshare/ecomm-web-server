import {
  PaymentTransactionStatus,
  PaymentWebhookStatus,
} from '#app/generated/prisma/enums';
import {
  isPaymentConfirmationApplied,
  shouldRetryWebhookEvent,
} from './payment-webhook-policy';

describe('payment webhook idempotency policy', () => {
  it('does not reprocess received or processed event IDs', () => {
    expect(shouldRetryWebhookEvent(PaymentWebhookStatus.RECEIVED)).toBe(false);
    expect(shouldRetryWebhookEvent(PaymentWebhookStatus.PROCESSED)).toBe(false);
  });

  it('allows a previously failed event to be retried', () => {
    expect(shouldRetryWebhookEvent(PaymentWebhookStatus.FAILED)).toBe(true);
  });

  it('recognizes an already-applied confirmation', () => {
    expect(
      isPaymentConfirmationApplied(PaymentTransactionStatus.CONFIRMED),
    ).toBe(true);
    expect(isPaymentConfirmationApplied(PaymentTransactionStatus.PENDING)).toBe(
      false,
    );
  });
});
