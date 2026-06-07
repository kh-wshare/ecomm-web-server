import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /users — Admin only: list all users */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] List all users' })
  findAll() {
    return this.usersService.findAll();
  }

  /** GET /users/me — Any authenticated user: get own profile */
  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  getMe(@CurrentUser() user: any) {
    return user;
  }

  /** GET /users/:id — Admin only */
  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /** POST /users — Admin only: create user with any role */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Create user with specified role' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.adminCreate(dto);
  }

  /** DELETE /users/:id — Admin only */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[Admin] Delete user by ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
