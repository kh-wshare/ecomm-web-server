import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PosDeviceStatus } from '#app/generated/prisma/enums';

export class RegisterPosDeviceDto {
  @ApiProperty({ example: 'POS-DEVICE-001', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  deviceId!: string;

  @ApiPropertyOptional({ example: 'Front Counter POS', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  deviceName?: string;

  @ApiPropertyOptional({ example: 'ANDROID', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  platform?: string;

  @ApiPropertyOptional({ example: '1.0.0', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  appVersion?: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;
}

export class PosDeviceQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: PosDeviceStatus })
  @IsEnum(PosDeviceStatus)
  @IsOptional()
  status?: PosDeviceStatus;
}
