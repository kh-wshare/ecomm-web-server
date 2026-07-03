import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MerchantStatus,
  MerchantUserStatus,
} from '#app/generated/prisma/enums';

export class MerchantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: MerchantStatus })
  status!: MerchantStatus;

  @ApiProperty()
  returnStockOnRefund!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  deletedAt!: Date | null;
}

class MembershipSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  invited!: number;

  @ApiProperty()
  disabled!: number;
}

class MerchantActivityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiPropertyOptional({ nullable: true })
  entityId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class MerchantDashboardDto {
  @ApiProperty({ type: MerchantDto })
  merchant!: MerchantDto;

  @ApiProperty({ type: MembershipSummaryDto })
  memberships!: MembershipSummaryDto;

  @ApiProperty()
  pendingInvitations!: number;

  @ApiProperty({ type: [MerchantActivityDto] })
  recentActivity!: MerchantActivityDto[];
}

export type MembershipCounts = Partial<Record<MerchantUserStatus, number>>;
