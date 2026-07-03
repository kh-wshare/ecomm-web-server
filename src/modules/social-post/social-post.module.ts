import { Module } from '@nestjs/common';
import { NotificationModule } from '#app/modules/notification/notification.module';
import { PublicSocialController } from './public-social.controller';
import { SocialPostController } from './social-post.controller';
import { SocialPostService } from './social-post.service';

@Module({
  imports: [NotificationModule],
  controllers: [SocialPostController, PublicSocialController],
  providers: [SocialPostService],
  exports: [SocialPostService],
})
export class SocialPostModule {}
