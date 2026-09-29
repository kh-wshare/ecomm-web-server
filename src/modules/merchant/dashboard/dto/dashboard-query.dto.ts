import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { DASHBOARD_INTERVALS, DASHBOARD_RANGES } from '../dashboard.util';
import type { DashboardInterval, DashboardRange } from '../dashboard.util';

export class DashboardRangeQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_RANGES, default: '30d' })
  @IsOptional()
  @IsIn(DASHBOARD_RANGES)
  range: DashboardRange = '30d';

  @ApiPropertyOptional({
    enum: DASHBOARD_INTERVALS,
    description: 'Defaults based on range when omitted',
  })
  @IsOptional()
  @IsIn(DASHBOARD_INTERVALS)
  interval?: DashboardInterval;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Required when range is custom',
  })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    format: 'date',
    description: 'Required when range is custom',
  })
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class DashboardTopProductsQueryDto extends DashboardRangeQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}
