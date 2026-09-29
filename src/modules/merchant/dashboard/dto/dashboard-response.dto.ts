import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DASHBOARD_INTERVALS, DASHBOARD_RANGES } from '../dashboard.util';

export class RevenuePointDto {
  @ApiProperty({ description: 'Bucket start, as an ISO date or hour' })
  bucket!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  revenue!: string;

  @ApiProperty()
  orders!: number;
}

export class RevenueTotalsDto {
  @ApiProperty()
  revenue!: string;

  @ApiProperty()
  orders!: number;

  @ApiProperty()
  changePct!: number;

  @ApiProperty({ enum: ['up', 'down', 'flat'] })
  trend!: 'up' | 'down' | 'flat';
}

export class RevenueResponseDto {
  @ApiProperty({ enum: DASHBOARD_RANGES })
  range!: string;

  @ApiProperty({ enum: DASHBOARD_INTERVALS })
  interval!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: RevenueTotalsDto })
  totals!: RevenueTotalsDto;

  @ApiProperty({ type: [RevenuePointDto] })
  points!: RevenuePointDto[];

  @ApiProperty()
  generatedAt!: string;
}

export class TopProductStockDto {
  @ApiProperty()
  onHand!: number;

  @ApiProperty()
  available!: number;

  @ApiProperty()
  lowStock!: boolean;

  @ApiProperty()
  tracked!: boolean;
}

export class TopProductItemDto {
  @ApiProperty()
  rank!: number;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  variantId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  sku!: string;

  @ApiPropertyOptional()
  imageUrl!: string | null;

  @ApiProperty()
  unitsSold!: number;

  @ApiProperty()
  revenue!: string;

  @ApiProperty()
  sharePct!: number;

  @ApiProperty({ type: TopProductStockDto })
  stock!: TopProductStockDto;
}

export class TopProductsResponseDto {
  @ApiProperty({ enum: DASHBOARD_RANGES })
  range!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: [TopProductItemDto] })
  items!: TopProductItemDto[];
}

export class SetupTaskDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  done!: boolean;

  @ApiPropertyOptional()
  completedAt!: string | null;

  @ApiProperty()
  href!: string;

  @ApiPropertyOptional()
  recommended?: boolean;
}

export class SetupStorefrontDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  qrCodeUrl!: string;

  @ApiProperty()
  published!: boolean;
}

export class SetupResponseDto {
  @ApiProperty()
  completed!: number;

  @ApiProperty()
  total!: number;

  @ApiPropertyOptional()
  dismissedAt!: string | null;

  @ApiProperty({ type: [SetupTaskDto] })
  tasks!: SetupTaskDto[];

  @ApiProperty({ type: SetupStorefrontDto })
  storefront!: SetupStorefrontDto;
}

export class SettlementAccountDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  bankName!: string;

  @ApiProperty()
  last4!: string;

  @ApiProperty()
  holderName!: string;
}

export class NextPayoutDto {
  @ApiProperty({ format: 'date' })
  scheduledFor!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  estimatedAmount!: string;
}

export class PayoutsResponseDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  available!: string;

  @ApiProperty()
  pending!: string;

  @ApiProperty({ type: NextPayoutDto })
  nextPayout!: NextPayoutDto;

  @ApiPropertyOptional({ type: SettlementAccountDto })
  settlementAccount!: SettlementAccountDto | null;

  @ApiProperty()
  canRequestPayout!: boolean;

  @ApiPropertyOptional()
  payoutBlockedReason!: string | null;
}

export class BalanceResponseDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty()
  available!: string;

  @ApiProperty()
  pending!: string;
}

export class SummaryMoneyKpiDto {
  @ApiProperty({ example: '1234.56' })
  value!: string;

  @ApiProperty()
  changePct!: number;

  @ApiProperty({ enum: ['up', 'down', 'flat'] })
  trend!: 'up' | 'down' | 'flat';
}

export class SummaryCountKpiDto {
  @ApiProperty()
  value!: number;

  @ApiProperty()
  changePct!: number;

  @ApiProperty({ enum: ['up', 'down', 'flat'] })
  trend!: 'up' | 'down' | 'flat';
}

export class SummaryPeriodDto {
  @ApiProperty({ format: 'date-time' })
  from!: string;

  @ApiProperty({ format: 'date-time' })
  to!: string;

  @ApiProperty()
  label!: string;
}

export class SummaryKpisDto {
  @ApiProperty({ type: SummaryMoneyKpiDto })
  totalRevenue!: SummaryMoneyKpiDto;

  @ApiProperty({ type: SummaryCountKpiDto })
  totalOrders!: SummaryCountKpiDto;

  @ApiProperty({ type: SummaryMoneyKpiDto })
  averageOrderValue!: SummaryMoneyKpiDto;

  @ApiProperty({ type: SummaryCountKpiDto })
  activeCustomers!: SummaryCountKpiDto;
}

export class SummaryResponseDto {
  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: SummaryPeriodDto })
  period!: SummaryPeriodDto;

  @ApiProperty({ type: SummaryPeriodDto })
  comparison!: SummaryPeriodDto;

  @ApiProperty({ type: SummaryKpisDto })
  kpis!: SummaryKpisDto;

  @ApiProperty()
  hasData!: boolean;

  @ApiProperty()
  generatedAt!: string;
}
