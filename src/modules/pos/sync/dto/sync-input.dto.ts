import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export const SYNC_OPERATION_TYPES = ['CREATE_ORDER'] as const;

export class SyncOperationDto {
  @ApiProperty({ example: 'sync-operation-1' })
  @IsString()
  id!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  // Deliberately just @IsString(), not restricted via @IsIn(SYNC_OPERATION_TYPES):
  // an unrecognized type must fail only *this* operation (see
  // PosSyncService.applyOperation's default case), not the whole batch via
  // ValidationPipe rejecting the request outright.
  @ApiProperty({ example: 'CREATE_ORDER' })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsObject()
  payload!: Record<string, unknown>;
}

export class SyncBatchDto {
  @ApiProperty({ example: 'POS-DEVICE-001' })
  @IsString()
  deviceId!: string;

  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}
