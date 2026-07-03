import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventoryExpiryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryExpiryWorker.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly inventoryService: InventoryService) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.INVENTORY_EXPIRY_WORKER_ENABLED === 'false'
    ) {
      return;
    }
    const interval = Number(process.env.INVENTORY_EXPIRY_INTERVAL_MS ?? 60_000);
    this.timer = setInterval(() => {
      void this.run();
    }, interval);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async run() {
    try {
      const expired = await this.inventoryService.expireReservations();
      if (expired) this.logger.log(`Expired ${expired} stock reservations`);
    } catch (error) {
      this.logger.error(
        'Inventory reservation expiry failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
