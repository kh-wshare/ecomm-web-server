import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentProviderCode,
  PaymentProviderStatus,
  PaymentTransactionStatus,
} from '#app/generated/prisma/enums';

export class PaymentProviderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PaymentProviderCode })
  provider!: PaymentProviderCode;

  @ApiProperty({ enum: PaymentProviderStatus })
  status!: PaymentProviderStatus;

  @ApiProperty({ type: 'object', additionalProperties: true })
  config!: Record<string, unknown>;

  @ApiProperty()
  hasWebhookSecret!: boolean;

  @ApiProperty()
  hasProviderSecret!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaymentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: PaymentProviderCode })
  provider!: PaymentProviderCode;

  @ApiProperty()
  providerTransactionId!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: PaymentTransactionStatus })
  status!: PaymentTransactionStatus;

  @ApiPropertyOptional()
  paidAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PaymentWebhookResultDto {
  @ApiProperty()
  duplicate!: boolean;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({ enum: ['RECEIVED', 'PROCESSED', 'FAILED'] })
  eventStatus!: string;

  @ApiProperty({ type: PaymentDto })
  payment!: PaymentDto;
}
