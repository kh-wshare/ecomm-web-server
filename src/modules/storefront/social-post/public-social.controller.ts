import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import {
  CurrentStorefrontMerchant,
  StorefrontScoped,
} from '#app/modules/storefront/context/current-storefront-merchant.decorator';
import { SocialPostService } from '@modules/merchant/social-post/social-post.service';
import { SocialLinkDto } from '@modules/merchant/social-post/dto/social-post-response.dto';
import { SocialLinkQueryDto } from '@modules/merchant/social-post/dto/social-post-input.dto';

@Public()
@ApiTags('Social Commerce')
@Controller()
export class PublicSocialController {
  constructor(private readonly socialPosts: SocialPostService) {}

  @Get('social-links/:hotspotId')
  @ApiOperation({
    summary: 'Resolve a hotspot with current stock availability',
  })
  @ApiOkResponse({ type: SocialLinkDto })
  resolveSocialLink(
    @Param('hotspotId', ParseUUIDPipe) hotspotId: string,
    @Query() query: SocialLinkQueryDto,
  ) {
    return this.socialPosts.resolveSocialLink(hotspotId, query.platform);
  }

  @Get('storefront/posts')
  @StorefrontScoped()
  @ApiOperation({ summary: 'List published website articles' })
  listArticles(@CurrentStorefrontMerchant('id') merchantId: string) {
    return this.socialPosts.listWebsiteArticles(merchantId);
  }

  @Get('storefront/posts/:slug')
  @StorefrontScoped()
  @ApiOperation({ summary: 'Get a published website article' })
  getArticle(
    @CurrentStorefrontMerchant('id') merchantId: string,
    @Param('slug') slug: string,
  ) {
    return this.socialPosts.getWebsiteArticle(merchantId, slug);
  }
}
