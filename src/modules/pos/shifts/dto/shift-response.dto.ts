import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PosShiftStatus } from '#app/generated/prisma/enums';

export class PosShiftDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  posDeviceId!: string;

  @ApiProperty()
  openedById!: string;

  @ApiPropertyOptional({ nullable: true })
  closedById!: string | null;

  @ApiProperty({ enum: PosShiftStatus })
  status!: PosShiftStatus;

  @ApiProperty()
  openingCash!: string;

  @ApiPropertyOptional({ nullable: true })
  closingCash!: string | null;

  @ApiPropertyOptional({ nullable: true })
  expectedCash!: string | null;

  @ApiPropertyOptional({ nullable: true })
  cashDifference!: string | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty()
  openedAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  closedAt!: Date | null;
}
