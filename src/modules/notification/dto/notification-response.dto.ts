import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data!: Record<string, unknown> | null;

  @ApiPropertyOptional()
  readAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class UnreadNotificationCountDto {
  @ApiProperty()
  count!: number;
}
