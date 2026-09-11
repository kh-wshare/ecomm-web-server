import { Module } from '@nestjs/common';
import { PosDevicesController } from './devices.controller';
import { PosDevicesService } from './devices.service';

@Module({
  controllers: [PosDevicesController],
  providers: [PosDevicesService],
  exports: [PosDevicesService],
})
export class PosDevicesModule {}
