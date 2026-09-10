import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsEnum } from 'class-validator';
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

  @ApiPropertyOptional({
    minLength: 16,
    maxLength: 200,
    description: 'Webhook signing secret. Required for the HMAC provider.',
  })
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  webhookSecret?: string;

  @ApiPropertyOptional({
    minLength: 8,
    maxLength: 1000,
    description:
      'Primary provider secret, such as a Bakong token or PayWay API key.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(1000)
  providerSecret?: string;

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
