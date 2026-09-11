import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PosDeviceStatus } from '#app/generated/prisma/enums';

export class PosDeviceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  deviceId!: string;

  @ApiProperty()
  branchId!: string;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ nullable: true })
  platform!: string | null;

  @ApiPropertyOptional({ nullable: true })
  appVersion!: string | null;

  @ApiProperty({ enum: PosDeviceStatus })
  status!: PosDeviceStatus;

  @ApiPropertyOptional({ nullable: true })
  lastSeenAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
