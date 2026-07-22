import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductCategoryStatus } from '#app/generated/prisma/enums';

export class ProductCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  merchantId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ enum: ProductCategoryStatus })
  status!: ProductCategoryStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
