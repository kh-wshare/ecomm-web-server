import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MerchantBranchStatus } from '#app/generated/prisma/enums';

const BRANCH_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class BranchQueryDto {
  @ApiPropertyOptional({ enum: MerchantBranchStatus })
  @IsEnum(MerchantBranchStatus)
  @IsOptional()
  status?: MerchantBranchStatus;
}

export class CreateBranchDto {
  @ApiProperty({ example: 'Central Counter', maxLength: 120 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'CENTRAL', maxLength: 40 })
  @IsString()
  @Matches(BRANCH_CODE_PATTERN)
  @MaxLength(40)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : undefined,
  )
  code!: string;

  @ApiPropertyOptional({ example: '+1 555 100 2000', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Market Street', maxLength: 180 })
  @IsString()
  @MaxLength(180)
  @IsOptional()
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Suite 5', maxLength: 180 })
  @IsString()
  @MaxLength(180)
  @IsOptional()
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'San Francisco', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'California', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ example: '94105', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'US', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'Register 01', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  registerName?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    enum: MerchantBranchStatus,
    default: MerchantBranchStatus.ACTIVE,
  })
  @IsEnum(MerchantBranchStatus)
  @IsOptional()
  status?: MerchantBranchStatus;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
