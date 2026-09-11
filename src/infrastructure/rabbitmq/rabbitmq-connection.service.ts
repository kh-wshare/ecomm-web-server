import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

/**
 * Owns the AMQP connection + a confirm channel that asserts the topic
 * exchange used for every POS event. Mirrors `RedisService`'s fail-soft
 * shape: connection errors are logged, never thrown, so a broker outage
 * degrades event delivery (retried by the outbox relay) instead of
 * crashing request handling.
 */
@Injectable()
export class RabbitMqConnectionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqConnectionService.name);
  private connection?: AmqpConnectionManager;
  private channelWrapper?: ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>(
      'rabbitmq.url',
      'amqp://localhost:5682',
    );
    const exchange = this.config.get<string>('rabbitmq.exchange', 'pos.events');

    this.connection = amqp.connect([url], {
      connectionOptions: { timeout: 5_000 },
    });
    this.connection.on('connect', () =>
      this.logger.log(`RabbitMQ connected at ${url}`),
    );
    this.connection.on('disconnect', ({ err }) =>
      this.logger.warn(`RabbitMQ disconnected: ${err?.message ?? 'unknown'}`),
    );
    this.connection.on('connectFailed', ({ err }) =>
      this.logger.error(`RabbitMQ connect failed: ${err.message}`),
    );

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: (channel: ConfirmChannel) =>
        channel.assertExchange(exchange, 'topic', { durable: true }),
    });
  }

  async onModuleDestroy() {
    await this.channelWrapper?.close();
    await this.connection?.close();
  }

  getChannel(): ChannelWrapper {
    if (!this.channelWrapper) {
      throw new Error('RabbitMQ channel has not been initialized');
    }
    return this.channelWrapper;
  }

  getExchange(): string {
    return this.config.get<string>('rabbitmq.exchange', 'pos.events');
  }
}
