import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { KitchenOrderStatus } from '#app/generated/prisma/enums';

export class KitchenOrderQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: KitchenOrderStatus })
  @IsEnum(KitchenOrderStatus)
  @IsOptional()
  status?: KitchenOrderStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  branchId?: string;
}

export class UpdateKitchenOrderStatusDto {
  @ApiProperty({ enum: KitchenOrderStatus })
  @IsEnum(KitchenOrderStatus)
  status!: KitchenOrderStatus;
}
