import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  NotificationDto,
  UnreadNotificationCountDto,
} from './dto/notification-response.dto';
import { NotificationService } from './notification.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@RequirePermission('dashboard.read')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the active merchant' })
  @ApiOkResponse({ type: [NotificationDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notifications.findAll(merchant.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count unread merchant notifications' })
  @ApiOkResponse({ type: UnreadNotificationCountDto })
  unreadCount(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.notifications.unreadCount(merchant.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every merchant notification as read' })
  markAllRead(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.notifications.markAllRead(merchant.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one merchant notification as read' })
  @ApiOkResponse({ type: NotificationDto })
  markRead(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(merchant.id, id);
  }
}
