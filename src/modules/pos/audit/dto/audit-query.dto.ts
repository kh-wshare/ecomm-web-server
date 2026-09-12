import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';

export class PosAuditQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ example: 'PAYMENT_SUCCESS' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ example: 'order' })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsString()
  @IsOptional()
  entityId?: string;
}
