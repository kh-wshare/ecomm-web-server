import { Module } from '@nestjs/common';
import { InventoryModule } from '#app/modules/inventory/inventory.module';
import { OrderModule } from '#app/modules/order/order.module';
import { PricingModule } from '#app/modules/pricing/pricing.module';
import { PosDevicesModule } from './devices/devices.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PosShiftsModule } from './shifts/shifts.module';

@Module({
  imports: [
    InventoryModule,
    OrderModule,
    PricingModule,
    PosDevicesModule,
    PosShiftsModule,
  ],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
