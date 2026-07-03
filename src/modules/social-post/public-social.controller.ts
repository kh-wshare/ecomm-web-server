import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { SocialLinkQueryDto } from './dto/social-post-input.dto';
import { SocialLinkDto } from './dto/social-post-response.dto';
import { SocialPostService } from './social-post.service';

@Public()
@ApiTags('Public Social Commerce')
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

  @Get('storefront/:merchantSlug/posts')
  @ApiOperation({ summary: 'List published website articles' })
  listArticles(@Param('merchantSlug') merchantSlug: string) {
    return this.socialPosts.listWebsiteArticles(merchantSlug);
  }

  @Get('storefront/:merchantSlug/posts/:slug')
  @ApiOperation({ summary: 'Get a published website article' })
  getArticle(
    @Param('merchantSlug') merchantSlug: string,
    @Param('slug') slug: string,
  ) {
    return this.socialPosts.getWebsiteArticle(merchantSlug, slug);
  }
}
