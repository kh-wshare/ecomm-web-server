import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString, IsUrl, MinLength } from 'class-validator';

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

export class TelegramTokenExchangeDto {
  @ApiProperty({
    description: 'Authorization code returned by Telegram OAuth',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'PKCE code verifier generated before authorization',
  })
  @IsString()
  @MinLength(43)
  codeVerifier!: string;

  @ApiProperty({
    description: 'Redirect URI used for the Telegram authorization request',
  })
  @IsString()
  @IsUrl({ require_tld: false })
  redirectUri!: string;
}
