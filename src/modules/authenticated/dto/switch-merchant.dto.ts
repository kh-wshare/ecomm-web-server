import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchMerchantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  merchantId!: string;
}
