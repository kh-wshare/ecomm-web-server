import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { OrderStatus } from '#app/generated/prisma/enums';

export class StorefrontOrderQueryDto extends BaseQueryDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  customerEmail!: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

export class StorefrontOrderLookupQueryDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  customerEmail!: string;
}
