import { Global, Module } from '@nestjs/common';
import { OutboxRelayWorker } from './outbox-relay.worker';
import { OutboxService } from './outbox.service';
import { RabbitMqConnectionService } from './rabbitmq-connection.service';
import { RabbitMqPublisherService } from './rabbitmq-publisher.service';

@Global()
@Module({
  providers: [
    RabbitMqConnectionService,
    RabbitMqPublisherService,
    OutboxService,
    OutboxRelayWorker,
  ],
  exports: [RabbitMqPublisherService, OutboxService],
})
export class RabbitMqModule {}
