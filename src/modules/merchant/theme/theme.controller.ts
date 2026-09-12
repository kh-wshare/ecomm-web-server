import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { PreviewThemeDto, UpdateThemeDraftDto } from './dto/theme-input.dto';
import {
  CurrentThemeDto,
  LiveThemeResponseDto,
  ThemePreviewDto,
} from './dto/theme-response.dto';
import { ThemeService } from './theme.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Theme Builder')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  @Get('current')
  @RequirePermission('theme.read')
  @ApiOperation({ summary: 'Get the active merchant draft and live theme' })
  @ApiOkResponse({ type: CurrentThemeDto })
  getCurrent(@CurrentMerchant() merchant: CurrentMerchantContext) {
    return this.themeService.getCurrent(merchant.id);
  }

  @Patch('draft')
  @RequirePermission('theme.update')
  @ApiOperation({ summary: 'Save the active merchant draft theme' })
  @ApiOkResponse({ type: CurrentThemeDto })
  @ApiConflictResponse({ description: 'Custom domain is already in use' })
  updateDraft(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateThemeDraftDto,
    @Req() request: Request,
  ) {
    return this.themeService.updateDraft(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('theme.read')
  @ApiOperation({ summary: 'Preview a saved or unsaved theme config' })
  @ApiOkResponse({ type: ThemePreviewDto })
  preview(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Body() dto: PreviewThemeDto,
  ) {
    return this.themeService.preview(merchant.id, dto);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('theme.publish')
  @ApiOperation({ summary: 'Publish the current draft theme' })
  @ApiOkResponse({ type: LiveThemeResponseDto })
  publish(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.themeService.publish(
      merchant.id,
      user.id,
      this.metadata(request),
    );
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('theme.update')
  @ApiOperation({ summary: 'Reset the draft to the default theme' })
  @ApiOkResponse({ type: CurrentThemeDto })
  reset(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.themeService.resetDraft(
      merchant.id,
      user.id,
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
