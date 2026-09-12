import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ThemeConfigDto {
  @ApiProperty({ additionalProperties: true })
  colors!: Record<string, string>;

  @ApiProperty({ additionalProperties: true })
  typography!: Record<string, string>;

  @ApiProperty({ additionalProperties: true })
  layout!: Record<string, unknown>;

  @ApiPropertyOptional({ additionalProperties: true })
  hero?: Record<string, unknown>;
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
