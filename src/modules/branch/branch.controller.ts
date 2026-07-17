import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
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
import { BranchService } from './branch.service';
import {
  BranchQueryDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch-input.dto';
import { BranchDto } from './dto/branch-response.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('Branches')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('branches')
export class BranchController {
  constructor(private readonly branches: BranchService) {}

  @Get()
  @RequirePermission('merchant.read')
  @ApiOperation({ summary: 'List merchant branches' })
  @ApiOkResponse({ type: [BranchDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: BranchQueryDto,
  ) {
    return this.branches.findAll(merchant.id, query);
  }

  @Post()
  @RequirePermission('merchant.update')
  @ApiOperation({ summary: 'Create a merchant branch' })
  @ApiCreatedResponse({ type: BranchDto })
  @ApiConflictResponse({ description: 'Branch code is already in use' })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
    @Req() request: Request,
  ) {
    return this.branches.create(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Patch(':id')
  @RequirePermission('merchant.update')
  @ApiOperation({ summary: 'Update a merchant branch' })
  @ApiOkResponse({ type: BranchDto })
  @ApiConflictResponse({ description: 'Branch code is already in use' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchDto,
    @Req() request: Request,
  ) {
    return this.branches.update(
      merchant.id,
      user.id,
      branchId,
      dto,
      this.metadata(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('merchant.update')
  @ApiOperation({ summary: 'Archive a merchant branch' })
  @ApiOkResponse({ type: BranchDto })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  archive(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) branchId: string,
    @Req() request: Request,
  ) {
    return this.branches.archive(
      merchant.id,
      user.id,
      branchId,
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
