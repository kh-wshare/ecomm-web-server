import { Module } from '@nestjs/common';
import { InventoryModule } from '#app/modules/inventory/inventory.module';
import { OrderModule } from '#app/modules/order/order.module';
import { PricingModule } from '#app/modules/pricing/pricing.module';
import { PosDevicesModule } from '../devices/devices.module';
import { PosShiftsModule } from '../shifts/shifts.module';
import { PosOrdersController } from './pos-orders.controller';
import { PosOrdersService } from './pos-orders.service';

@Module({
  imports: [
    InventoryModule,
    OrderModule,
    PricingModule,
    PosDevicesModule,
    PosShiftsModule,
  ],
  controllers: [PosOrdersController],
  providers: [PosOrdersService],
  exports: [PosOrdersService],
})
export class PosOrdersModule {}
