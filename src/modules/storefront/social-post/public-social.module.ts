import { Module } from '@nestjs/common';
import { NotificationModule } from '@modules/notification/notification.module';
import { SocialPostService } from '@modules/social-post/social-post.service';
import { PublicSocialController } from './public-social.controller';

@Module({
  imports: [NotificationModule],
  controllers: [PublicSocialController],
  providers: [SocialPostService],
  exports: [],
})
export class StorefrontSocialPostModule {}
