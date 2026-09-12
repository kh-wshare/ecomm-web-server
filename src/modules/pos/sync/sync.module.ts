import { Module } from '@nestjs/common';
import { PosOrdersModule } from '../orders/pos-orders.module';
import { PosSyncController } from './sync.controller';
import { PosSyncService } from './sync.service';

@Module({
  imports: [PosOrdersModule],
  controllers: [PosSyncController],
  providers: [PosSyncService],
})
export class PosSyncModule {}
