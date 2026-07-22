import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { ProductCategoryStatus } from '#app/generated/prisma/enums';

export class ProductCategoryQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: ProductCategoryStatus })
  @IsEnum(ProductCategoryStatus)
  @IsOptional()
  status?: ProductCategoryStatus;
}
