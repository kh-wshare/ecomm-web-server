import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { ProductStatus } from '#app/generated/prisma/enums';

export class ProductQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}
