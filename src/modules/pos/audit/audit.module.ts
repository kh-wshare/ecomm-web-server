import { Module } from '@nestjs/common';
import { PosAuditController } from './audit.controller';
import { PosAuditService } from './audit.service';

@Module({
  controllers: [PosAuditController],
  providers: [PosAuditService],
})
export class PosAuditModule {}
