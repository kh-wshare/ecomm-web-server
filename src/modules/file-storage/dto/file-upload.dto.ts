import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({ default: 'media', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  purpose = 'media';

  @ApiPropertyOptional({ enum: ['public', 'private'], default: 'public' })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility: 'public' | 'private' = 'public';
}

export class UploadedFileDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  provider!: string;

  @ApiPropertyOptional()
  bucket?: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  size!: number;
}
