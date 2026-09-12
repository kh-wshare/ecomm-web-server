import { Module } from '@nestjs/common';
import { InventoryModule } from '#app/modules/inventory/inventory.module';
import { OrderModule } from '#app/modules/order/order.module';
import { PricingModule } from '#app/modules/pricing/pricing.module';
import { PosAuditModule } from './audit/audit.module';
import { PosCustomersModule } from './customers/customers.module';
import { PosDevicesModule } from './devices/devices.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { PosOrdersModule } from './orders/pos-orders.module';
import { PosPaymentsModule } from './payments/pos-payments.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PosRealtimeModule } from './realtime/pos-realtime.module';
import { PosShiftsModule } from './shifts/shifts.module';
import { PosSyncModule } from './sync/sync.module';
import { PosTablesModule } from './tables/tables.module';

@Module({
  imports: [
    InventoryModule,
    OrderModule,
    PricingModule,
    PosDevicesModule,
    PosShiftsModule,
    PosOrdersModule,
    KitchenModule,
    PosPaymentsModule,
    PosTablesModule,
    PosCustomersModule,
    PosSyncModule,
    PosAuditModule,
    PosRealtimeModule,
  ],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
