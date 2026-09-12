import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PosTableStatus } from '#app/generated/prisma/enums';

export class CreatePosTableDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'T01', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  name!: string;

  @ApiPropertyOptional({ example: 'T01', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  seats?: number;
}

export class UpdatePosTableDto {
  @ApiPropertyOptional({ enum: PosTableStatus })
  @IsEnum(PosTableStatus)
  @IsOptional()
  status?: PosTableStatus;

  @ApiPropertyOptional({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  seats?: number;
}

export class PosTableQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ enum: PosTableStatus })
  @IsEnum(PosTableStatus)
  @IsOptional()
  status?: PosTableStatus;
}
