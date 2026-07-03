import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import { SalesChannel } from '#app/generated/prisma/enums';

export class StorefrontProductQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    enum: SalesChannel,
    default: SalesChannel.WEBSITE,
  })
  @IsEnum(SalesChannel)
  @IsOptional()
  channel?: SalesChannel = SalesChannel.WEBSITE;
}
