import { registerAs } from '@nestjs/config';

export default registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5682',
  exchange: process.env.RABBITMQ_EXCHANGE ?? 'pos.events',
  outboxRelay: {
    enabled: process.env.POS_OUTBOX_RELAY_ENABLED !== 'false',
    intervalMs: parseInt(
      process.env.POS_OUTBOX_RELAY_INTERVAL_MS ?? '2000',
      10,
    ),
    batchSize: parseInt(process.env.POS_OUTBOX_RELAY_BATCH_SIZE ?? '50', 10),
    maxAttempts: parseInt(
      process.env.POS_OUTBOX_RELAY_MAX_ATTEMPTS ?? '10',
      10,
    ),
  },
}));
