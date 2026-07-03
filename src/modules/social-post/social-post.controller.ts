import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import {
  AddHotspotDto,
  CreateSocialPostDto,
  PublishSocialPostDto,
  SocialPostQueryDto,
  UpdateSocialPostDto,
} from './dto/social-post-input.dto';
import {
  ShoppableHotspotDto,
  SocialPostDto,
  SocialPublishLogDto,
} from './dto/social-post-response.dto';
import { SocialPostService } from './social-post.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Social Commerce')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('social-posts')
export class SocialPostController {
  constructor(private readonly socialPosts: SocialPostService) {}

  @Post()
  @RequirePermission('social_post.create')
  @ApiOperation({ summary: 'Create a social post draft' })
  @ApiCreatedResponse({ type: SocialPostDto })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSocialPostDto,
    @Req() request: Request,
  ) {
    return this.socialPosts.create(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Get()
  @RequirePermission('social_post.read')
  @ApiOperation({ summary: 'List social posts for the active merchant' })
  @ApiOkResponse({ type: [SocialPostDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: SocialPostQueryDto,
  ) {
    return this.socialPosts.findAll(merchant.id, query);
  }

  @Get(':id')
  @RequirePermission('social_post.read')
  @ApiOperation({ summary: 'Get a social post from the active merchant' })
  @ApiOkResponse({ type: SocialPostDto })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.socialPosts.findOne(merchant.id, id);
  }

  @Patch(':id')
  @RequirePermission('social_post.update')
  @ApiOperation({ summary: 'Update an unpublished social post' })
  @ApiOkResponse({ type: SocialPostDto })
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSocialPostDto,
    @Req() request: Request,
  ) {
    return this.socialPosts.update(
      merchant.id,
      id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Post(':id/hotspots')
  @RequirePermission('social_post.update')
  @ApiOperation({ summary: 'Add an active product hotspot' })
  @ApiCreatedResponse({ type: ShoppableHotspotDto })
  addHotspot(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddHotspotDto,
    @Req() request: Request,
  ) {
    return this.socialPosts.addHotspot(
      merchant.id,
      id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Post(':id/publish')
  @RequirePermission('social_post.publish')
  @ApiOperation({ summary: 'Publish to each selected platform independently' })
  @ApiCreatedResponse({ type: SocialPostDto })
  publish(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishSocialPostDto,
    @Req() request: Request,
  ) {
    return this.socialPosts.publish(
      merchant.id,
      id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Get(':id/logs')
  @RequirePermission('social_post.read')
  @ApiOperation({ summary: 'Get per-platform publishing logs' })
  @ApiOkResponse({ type: [SocialPublishLogDto] })
  logs(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.socialPosts.logs(merchant.id, id);
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    };
  }
}
