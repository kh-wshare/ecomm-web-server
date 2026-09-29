import { Module } from '@nestjs/common';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ReportExportController } from './report-export.controller';
import { ReportExportService } from './report-export.service';

@Module({
  imports: [FileStorageModule],
  controllers: [DashboardController, ReportExportController],
  providers: [DashboardService, ReportExportService],
  exports: [DashboardService],
})
export class DashboardModule {}
