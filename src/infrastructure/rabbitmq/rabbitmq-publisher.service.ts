import { Injectable, Logger } from '@nestjs/common';
import { RabbitMqConnectionService } from './rabbitmq-connection.service';

@Injectable()
export class RabbitMqPublisherService {
  private readonly logger = new Logger(RabbitMqPublisherService.name);

  constructor(private readonly connection: RabbitMqConnectionService) {}

  async publish(routingKey: string, payload: unknown): Promise<void> {
    const exchange = this.connection.getExchange();
    await this.connection.getChannel().publish(exchange, routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
    });
    this.logger.debug(`Published ${routingKey} to ${exchange}`);
  }
}
