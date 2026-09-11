import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus } from '#app/generated/prisma/enums';
import { EventBusService } from '#app/infrastructure/events/event-bus.service';
import { PrismaService } from '../database/prisma.service';
import { RabbitMqPublisherService } from './rabbitmq-publisher.service';

/**
 * Polls the durable `OutboxEvent` table written transactionally alongside
 * POS business writes, publishes each pending row to RabbitMQ, and — once
 * published — re-emits it on the in-process `EventBusService` so existing
 * WebSocket gateways (`NotificationGateway`, the new POS gateway) keep
 * working off the pattern they already use. Same interval-worker shape as
 * `InventoryExpiryWorker`, disabled the same way under `NODE_ENV=test`.
 */
@Injectable()
export class OutboxRelayWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: RabbitMqPublisherService,
    private readonly eventBus: EventBusService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const enabled = this.config.get<boolean>(
      'rabbitmq.outboxRelay.enabled',
      true,
    );
    if (process.env.NODE_ENV === 'test' || !enabled) return;

    const interval = this.config.get<number>(
      'rabbitmq.outboxRelay.intervalMs',
      2_000,
    );
    this.timer = setInterval(() => {
      void this.run();
    }, interval);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.relayPending();
    } catch (error) {
      this.logger.error(
        'Outbox relay run failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }

  private async relayPending() {
    const batchSize = this.config.get<number>(
      'rabbitmq.outboxRelay.batchSize',
      50,
    );
    const maxAttempts = this.config.get<number>(
      'rabbitmq.outboxRelay.maxAttempts',
      10,
    );

    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxEventStatus.PENDING,
        availableAt: { lte: new Date() },
      },
      orderBy: { availableAt: 'asc' },
      take: batchSize,
    });

    for (const event of events) {
      try {
        await this.publisher.publish(event.eventType, {
          id: event.id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.payload,
          occurredAt: event.createdAt,
        });
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxEventStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });
        this.eventBus.publish(event.eventType, event.payload);
      } catch (error) {
        const attempts = event.attempts + 1;
        const backoffMs = Math.min(30_000, 1_000 * 2 ** attempts);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts,
            lastError: error instanceof Error ? error.message : String(error),
            status:
              attempts >= maxAttempts
                ? OutboxEventStatus.FAILED
                : OutboxEventStatus.PENDING,
            availableAt: new Date(Date.now() + backoffMs),
          },
        });
        this.logger.warn(
          `Failed to relay outbox event ${event.id} (attempt ${attempts.toString()})`,
        );
      }
    }
  }
}
