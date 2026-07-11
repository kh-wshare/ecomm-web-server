import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString } from 'class-validator';

export class FirebaseGoogleLoginDto {
  @ApiProperty({
    description: 'Firebase Authentication ID token from Google sign-in',
  })
  @IsString()
  @IsJWT()
  idToken!: string;
}

export class TelegramLoginDto {
  @ApiProperty({
    description: 'Telegram Login OIDC ID token returned by telegram-login.js',
  })
  @IsString()
  @IsJWT()
  idToken!: string;
}
