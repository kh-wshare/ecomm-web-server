import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class TelegramMiniAppLoginDto {
  @ApiProperty({
    description:
      'Raw Telegram.WebApp.initData string from the Mini App (never initDataUnsafe)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  initData!: string;
}
