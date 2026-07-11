import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '#app/modules/authenticated/auth.service';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import {
  FirebaseGoogleLoginDto,
  TelegramLoginDto,
} from './dto/social-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class SocialAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login/firebase-google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with a Firebase Google ID token' })
  loginWithFirebaseGoogle(
    @Body() dto: FirebaseGoogleLoginDto,
    @Req() request: Request,
  ) {
    return this.authService.loginWithFirebaseGoogle(
      dto,
      this.metadata(request),
    );
  }

  @Public()
  @Post('login/telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with a Telegram OIDC ID token' })
  loginWithTelegram(@Body() dto: TelegramLoginDto, @Req() request: Request) {
    return this.authService.loginWithTelegram(dto, this.metadata(request));
  }

  @Public()
  @Post('customer/login/firebase-google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login as a storefront customer with Firebase Google',
  })
  loginCustomerWithFirebaseGoogle(
    @Body() dto: FirebaseGoogleLoginDto,
    @Req() request: Request,
  ) {
    return this.authService.loginCustomerWithFirebaseGoogle(
      dto,
      this.metadata(request),
    );
  }

  @Public()
  @Post('customer/login/telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as a storefront customer with Telegram' })
  loginCustomerWithTelegram(
    @Body() dto: TelegramLoginDto,
    @Req() request: Request,
  ) {
    return this.authService.loginCustomerWithTelegram(
      dto,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
