import { IdempotencyKeyStatus } from '#app/generated/prisma/enums';
import {
  isIdempotentResponseReady,
  shouldRetryIdempotencyKey,
} from './idempotency-policy';

describe('idempotency key policy', () => {
  it('does not allow retrying an in-progress or completed key', () => {
    expect(shouldRetryIdempotencyKey(IdempotencyKeyStatus.IN_PROGRESS)).toBe(
      false,
    );
    expect(shouldRetryIdempotencyKey(IdempotencyKeyStatus.COMPLETED)).toBe(
      false,
    );
  });

  it('allows retrying a previously failed key', () => {
    expect(shouldRetryIdempotencyKey(IdempotencyKeyStatus.FAILED)).toBe(true);
  });

  it('only replays a response once the key has completed', () => {
    expect(isIdempotentResponseReady(IdempotencyKeyStatus.COMPLETED)).toBe(
      true,
    );
    expect(isIdempotentResponseReady(IdempotencyKeyStatus.IN_PROGRESS)).toBe(
      false,
    );
    expect(isIdempotentResponseReady(IdempotencyKeyStatus.FAILED)).toBe(false);
  });
});
