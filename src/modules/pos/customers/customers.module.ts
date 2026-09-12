import { Module } from '@nestjs/common';
import { PosCustomersController } from './customers.controller';
import { PosCustomersService } from './customers.service';

@Module({
  controllers: [PosCustomersController],
  providers: [PosCustomersService],
  exports: [PosCustomersService],
})
export class PosCustomersModule {}
