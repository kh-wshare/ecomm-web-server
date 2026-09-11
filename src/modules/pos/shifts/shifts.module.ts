import { Module } from '@nestjs/common';
import { PosDevicesModule } from '../devices/devices.module';
import { PosShiftsController } from './shifts.controller';
import { PosShiftsService } from './shifts.service';

@Module({
  imports: [PosDevicesModule],
  controllers: [PosShiftsController],
  providers: [PosShiftsService],
  exports: [PosShiftsService],
})
export class PosShiftsModule {}
