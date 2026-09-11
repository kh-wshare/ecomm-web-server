import { Injectable } from '@nestjs/common';
import type { Prisma } from '#app/generated/prisma/client';

export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  merchantId?: string;
}

/**
 * Thin helper for writing an `OutboxEvent` row inside the same `$transaction`
 * as the business write it accompanies (the outbox pattern), so the DB state
 * change and the eventually-published event can never desync. Call
 * `write(tx, {...})` from inside a service's own `prisma.$transaction`
 * callback, the same way `tx.auditLog.create(...)` is already called inline.
 */
@Injectable()
export class OutboxService {
  write(tx: Prisma.TransactionClient, event: OutboxEventInput) {
    return tx.outboxEvent.create({
      data: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
        merchantId: event.merchantId,
      },
    });
  }
}
