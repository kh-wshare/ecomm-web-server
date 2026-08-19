import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, IsUUID, Length, Matches, MaxLength, MinLength } from "class-validator";

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