import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThemeBrandDto {
  @ApiProperty()
  storeName!: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  faviconUrl!: string | null;
}

export class ThemeSchemeColorsDto {
  @ApiProperty()
  background!: string;

  @ApiProperty()
  surface!: string;

  @ApiProperty()
  foreground!: string;
}

export class ThemeColorsDto {
  @ApiProperty({
    enum: ['emerald', 'indigo', 'rose', 'saffron', 'graphite', 'custom'],
  })
  preset!: 'emerald' | 'indigo' | 'rose' | 'saffron' | 'graphite' | 'custom';

  @ApiProperty()
  accent!: string;

  @ApiProperty({ enum: ['light', 'dark', 'system'] })
  scheme!: 'light' | 'dark' | 'system';

  @ApiProperty({ type: ThemeSchemeColorsDto })
  light!: ThemeSchemeColorsDto;

  @ApiProperty({ type: ThemeSchemeColorsDto })
  dark!: ThemeSchemeColorsDto;
}

const THEME_FONTS = [
  'system',
  'dm-sans',
  'manrope',
  'plus-jakarta',
  'kantumruy',
  'noto-khmer',
  'fraunces',
  'playfair',
] as const;
type ThemeFont = (typeof THEME_FONTS)[number];

export class ThemeTypographyDto {
  @ApiProperty({ enum: THEME_FONTS })
  heading!: ThemeFont;

  @ApiProperty({ enum: THEME_FONTS })
  body!: ThemeFont;

  @ApiProperty()
  baseSize!: number;
}

export class ThemeShapeDto {
  @ApiProperty()
  radius!: number;

  @ApiProperty({ enum: ['solid', 'outline', 'soft'] })
  buttonStyle!: 'solid' | 'outline' | 'soft';
}

export class ThemeLayoutDto {
  @ApiProperty({ enum: ['classic', 'boutique', 'market'] })
  template!: 'classic' | 'boutique' | 'market';

  @ApiProperty({ enum: ['left', 'center'] })
  headerAlign!: 'left' | 'center';

  @ApiProperty()
  stickyHeader!: boolean;

  @ApiProperty({ enum: [2, 3, 4, 5] })
  productColumns!: 2 | 3 | 4 | 5;

  @ApiProperty({ enum: ['bordered', 'flat', 'elevated'] })
  cardStyle!: 'bordered' | 'flat' | 'elevated';
}

export class ThemeAnnouncementDto {
  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  text!: string;
}

export class ThemeHeroDto {
  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty()
  heading!: string;

  @ApiProperty()
  subheading!: string;

  @ApiProperty()
  ctaLabel!: string;

  @ApiProperty({ enum: ['left', 'center'] })
  align!: 'left' | 'center';

  @ApiProperty()
  overlay!: number;

  @ApiProperty({ enum: ['short', 'medium', 'tall'] })
  height!: 'short' | 'medium' | 'tall';
}

const THEME_SECTION_IDS = [
  'hero',
  'promises',
  'featured',
  'categories',
  'shopTheLook',
  'newsletter',
] as const;
type ThemeSectionId = (typeof THEME_SECTION_IDS)[number];

export class ThemeSectionDto {
  @ApiProperty({ enum: THEME_SECTION_IDS })
  id!: ThemeSectionId;

  @ApiProperty()
  enabled!: boolean;
}

export class ThemeProductCardDto {
  @ApiProperty({ enum: ['square', 'portrait', 'landscape'] })
  imageRatio!: 'square' | 'portrait' | 'landscape';

  @ApiProperty()
  quickAdd!: boolean;

  @ApiProperty()
  secondImageOnHover!: boolean;

  @ApiProperty()
  showRiel!: boolean;
}

export class ThemeProductPageDto {
  @ApiProperty({ enum: ['thumbnails', 'stacked'] })
  gallery!: 'thumbnails' | 'stacked';

  @ApiProperty()
  stickyBuyBar!: boolean;

  @ApiProperty()
  showDeliveryEstimate!: boolean;
}

export class ThemePromiseItemDto {
  @ApiProperty({
    enum: ['truck', 'qr', 'store', 'shield', 'refresh', 'leaf'],
  })
  icon!: 'truck' | 'qr' | 'store' | 'shield' | 'refresh' | 'leaf';

  @ApiProperty()
  text!: string;
}

export class ThemePromisesDto {
  @ApiProperty({ type: [ThemePromiseItemDto] })
  items!: ThemePromiseItemDto[];
}

export class ThemeFooterSocialDto {
  @ApiProperty()
  facebook!: string;

  @ApiProperty()
  instagram!: string;

  @ApiProperty()
  tiktok!: string;

  @ApiProperty()
  telegram!: string;
}

export class ThemeFooterDto {
  @ApiProperty()
  about!: string;

  @ApiProperty()
  showPaymentBadges!: boolean;

  @ApiProperty({ type: ThemeFooterSocialDto })
  social!: ThemeFooterSocialDto;
}

export class ThemeMobileDto {
  @ApiProperty()
  bottomBar!: boolean;

  @ApiProperty()
  floatingCart!: boolean;
}

export class ThemeConfigDto {
  @ApiProperty()
  version!: number;

  @ApiProperty({ type: ThemeBrandDto })
  brand!: ThemeBrandDto;

  @ApiProperty({ type: ThemeColorsDto })
  colors!: ThemeColorsDto;

  @ApiProperty({ type: ThemeTypographyDto })
  typography!: ThemeTypographyDto;

  @ApiProperty({ type: ThemeShapeDto })
  shape!: ThemeShapeDto;

  @ApiProperty({ type: ThemeLayoutDto })
  layout!: ThemeLayoutDto;

  @ApiProperty({ type: ThemeAnnouncementDto })
  announcement!: ThemeAnnouncementDto;

  @ApiProperty({ type: ThemeHeroDto })
  hero!: ThemeHeroDto;

  @ApiProperty({ type: [ThemeSectionDto] })
  sections!: ThemeSectionDto[];

  @ApiProperty({ type: ThemeProductCardDto })
  productCard!: ThemeProductCardDto;

  @ApiProperty({ type: ThemeProductPageDto })
  productPage!: ThemeProductPageDto;

  @ApiProperty({ type: ThemePromisesDto })
  promises!: ThemePromisesDto;

  @ApiProperty({ type: ThemeFooterDto })
  footer!: ThemeFooterDto;

  @ApiProperty({ type: ThemeMobileDto })
  mobile!: ThemeMobileDto;
}

export class LiveThemeResponseDto {
  @ApiProperty()
  version!: number;

  @ApiProperty({ type: ThemeConfigDto })
  config!: ThemeConfigDto;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  publishedAt!: string | null;
}

export class CurrentThemeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  merchantId!: string;

  @ApiProperty({ type: ThemeConfigDto })
  liveConfig!: ThemeConfigDto;

  @ApiProperty({ type: ThemeConfigDto })
  draftConfig!: ThemeConfigDto;

  @ApiPropertyOptional({ nullable: true })
  customDomain!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class ThemePreviewDto extends LiveThemeResponseDto {
  @ApiProperty()
  preview!: boolean;

  @ApiProperty({ enum: ['draft', 'provided'] })
  source!: 'draft' | 'provided';
}
