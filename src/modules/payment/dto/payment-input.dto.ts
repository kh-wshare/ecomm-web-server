import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsEnum, IsIn } from 'class-validator';
import { BaseQueryDto } from '#app/common/dto/base-query.dto';
import {
  PaymentProviderCode,
  PaymentProviderStatus,
  PaymentTransactionStatus,
} from '#app/generated/prisma/enums';

export class PaymentQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ enum: PaymentProviderCode })
  @IsOptional()
  @IsEnum(PaymentProviderCode)
  provider?: PaymentProviderCode;

  @ApiPropertyOptional({ enum: PaymentTransactionStatus })
  @IsOptional()
  @IsEnum(PaymentTransactionStatus)
  status?: PaymentTransactionStatus;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class ConnectPaymentProviderDto {
  @ApiProperty({ enum: PaymentProviderCode })
  @IsEnum(PaymentProviderCode)
  provider!: PaymentProviderCode;

  @ApiProperty({ minLength: 16, maxLength: 200 })
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  webhookSecret!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Non-secret provider metadata such as an account identifier',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: PaymentProviderStatus, default: 'ACTIVE' })
  @IsOptional()
  @IsEnum(PaymentProviderStatus)
  status: PaymentProviderStatus = PaymentProviderStatus.ACTIVE;
}

export class CreatePaymentIntentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({
    description: 'Secret issued when the checkout session was created',
  })
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  checkoutToken!: string;

  @ApiProperty({ enum: PaymentProviderCode })
  @IsEnum(PaymentProviderCode)
  provider!: PaymentProviderCode;
}

export class PaymentWebhookDto {
  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  eventId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  paymentId!: string;

  @ApiProperty({ maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  providerTransactionId!: string;

  @ApiProperty({ enum: ['CONFIRMED', 'FAILED'] })
  @IsIn(['CONFIRMED', 'FAILED'])
  status!: 'CONFIRMED' | 'FAILED';

  @ApiProperty({ example: '39.98' })
  @IsString()
  @Matches(/^(0|[1-9]\d*)(\.\d{1,2})?$/)
  amount!: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}
