import { PlatformRole } from '#app/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'StrongPassword123!', minLength: 10 })
  @IsString()
  @MinLength(10)
  password!: string;

  @ApiPropertyOptional({ enum: PlatformRole, default: PlatformRole.USER })
  @IsEnum(PlatformRole)
  platformRole: PlatformRole = PlatformRole.USER;
}
