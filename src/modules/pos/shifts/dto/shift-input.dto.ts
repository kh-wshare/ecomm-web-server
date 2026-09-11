import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenPosShiftDto {
  @ApiProperty({ example: 'POS-DEVICE-001' })
  @IsString()
  deviceId!: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingCash!: number;
}

export class ClosePosShiftDto {
  @ApiProperty({ example: 450 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  closingCash!: number;

  @ApiPropertyOptional({ example: 'End of shift' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class CurrentPosShiftQueryDto {
  @ApiProperty({ example: 'POS-DEVICE-001' })
  @IsString()
  deviceId!: string;
}
