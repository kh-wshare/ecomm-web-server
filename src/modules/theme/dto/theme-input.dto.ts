import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateThemeDraftDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Complete theme config validated against the theme JSON Schema',
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'shop.example.com',
    nullable: true,
    maxLength: 253,
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(253)
  @Matches(
    /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/,
    { message: 'customDomain must be a valid hostname' },
  )
  customDomain?: string | null;
}

export class PreviewThemeDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Optional unsaved config to preview',
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}
