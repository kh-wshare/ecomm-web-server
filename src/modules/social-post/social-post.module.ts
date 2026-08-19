import { Module } from '@nestjs/common';
import { NotificationModule } from '#app/modules/notification/notification.module';
import { SocialPostController } from './social-post.controller';
import { SocialPostService } from './social-post.service';

@Module({
  imports: [NotificationModule],
  controllers: [SocialPostController],
  providers: [SocialPostService],
  exports: [SocialPostService],
})
export class SocialPostModule {}
