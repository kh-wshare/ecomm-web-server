import { ApiProperty } from "@nestjs/swagger";
import { PaymentDto } from "@modules/payment/dto/payment-response.dto";

export class PaymentWebhookRespDto {
  @ApiProperty()
  duplicate!: boolean;

  @ApiProperty()
  eventId!: string;

  @ApiProperty({ enum: ['RECEIVED', 'PROCESSED', 'FAILED'] })
  eventStatus!: string;

  @ApiProperty({ type: PaymentDto })
  payment!: PaymentDto;
}
