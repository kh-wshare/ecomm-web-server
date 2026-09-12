import { Module } from '@nestjs/common';
import { PosTablesController } from './tables.controller';
import { PosTablesService } from './tables.service';

@Module({
  controllers: [PosTablesController],
  providers: [PosTablesService],
  exports: [PosTablesService],
})
export class PosTablesModule {}
