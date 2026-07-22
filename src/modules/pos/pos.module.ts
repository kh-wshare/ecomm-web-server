import { Module } from '@nestjs/common';
import { InventoryModule } from '#app/modules/inventory/inventory.module';
import { OrderModule } from '#app/modules/order/order.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [InventoryModule, OrderModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
