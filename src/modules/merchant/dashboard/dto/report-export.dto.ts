import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { DASHBOARD_RANGES } from '../dashboard.util';
import type { DashboardRange } from '../dashboard.util';

const SUPPORTED_REPORTS = ['dashboard'] as const;
const SUPPORTED_FORMATS = ['csv'] as const;

export class CreateReportExportDto {
  @ApiProperty({ enum: SUPPORTED_REPORTS })
  @IsIn(SUPPORTED_REPORTS)
  report!: (typeof SUPPORTED_REPORTS)[number];

  @ApiProperty({ enum: SUPPORTED_FORMATS })
  @IsIn(SUPPORTED_FORMATS)
  format!: (typeof SUPPORTED_FORMATS)[number];

  @ApiProperty({ enum: DASHBOARD_RANGES })
  @IsIn(DASHBOARD_RANGES)
  range!: DashboardRange;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}

export class ReportExportResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['READY', 'FAILED'] })
  status!: 'READY' | 'FAILED';

  @ApiPropertyOptional()
  rowCount!: number | null;

  @ApiPropertyOptional()
  downloadUrl!: string | null;

  @ApiPropertyOptional()
  expiresAt!: string | null;

  @ApiPropertyOptional()
  error!: string | null;
}
