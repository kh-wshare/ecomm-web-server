import { IdempotencyKeyStatus } from '#app/generated/prisma/enums';

/** A key can only be retried (re-executed) once its prior attempt failed. */
export function shouldRetryIdempotencyKey(status: IdempotencyKeyStatus) {
  return status === IdempotencyKeyStatus.FAILED;
}

/** A completed key's stored response should be replayed rather than re-executed. */
export function isIdempotentResponseReady(status: IdempotencyKeyStatus) {
  return status === IdempotencyKeyStatus.COMPLETED;
}
