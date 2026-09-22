import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoyaltyEntryType } from '#app/generated/prisma/enums';

export class LoyaltyEntryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: LoyaltyEntryType })
  type!: LoyaltyEntryType;

  @ApiProperty({
    example: 25,
    description: 'Signed: positive when earned, negative when reversed',
  })
  points!: number;

  @ApiProperty({ example: 125 })
  balanceAfter!: number;

  @ApiPropertyOptional({ nullable: true, example: 'Order ORD-2026-0001' })
  note!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  orderId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class LoyaltyBalanceDto {
  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty({ example: 125 })
  balance!: number;

  @ApiProperty({ type: [LoyaltyEntryDto], description: 'Most recent 20' })
  entries!: LoyaltyEntryDto[];
}
