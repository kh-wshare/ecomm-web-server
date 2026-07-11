import { Module } from '@nestjs/common';
import { AuthorizationModule } from '#app/modules/authorization/authorization.module';
import { SocialAuthService } from './social-auth.service';
import { SocialTokenVerifierService } from './social-token-verifier.service';

@Module({
  imports: [AuthorizationModule],
  providers: [SocialAuthService, SocialTokenVerifierService],
  exports: [SocialAuthService],
})
export class SocialAuthModule {}
