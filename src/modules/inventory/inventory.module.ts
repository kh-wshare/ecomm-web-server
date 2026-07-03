import { Module } from '@nestjs/common';
import { NotificationModule } from '#app/modules/notification/notification.module';
import { InventoryController } from './inventory.controller';
import { InventoryExpiryWorker } from './inventory-expiry.worker';
import { InventoryService } from './inventory.service';

@Module({
  imports: [NotificationModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryExpiryWorker],
  exports: [InventoryService],
})
export class InventoryModule {}
