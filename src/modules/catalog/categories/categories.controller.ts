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
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/category-input.dto';
import { ProductCategoryQueryDto } from './dto/category-query.dto';
import { ProductCategoryDto } from './dto/category-response.dto';
import { CategoriesService } from './categories.service';

type CurrentMerchantContext = { id: string };

@ApiTags('Catalog')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'List product categories for the active merchant' })
  @ApiOkResponse({ type: [ProductCategoryDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: ProductCategoryQueryDto,
  ) {
    return this.categories.findAll(merchant.id, query);
  }

  @Post()
  @RequirePermission('product.create')
  @ApiOperation({ summary: 'Create a product category' })
  @ApiCreatedResponse({ type: ProductCategoryDto })
  @ApiConflictResponse({ description: 'Category slug is already in use' })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductCategoryDto,
    @Req() request: Request,
  ) {
    return this.categories.create(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Patch(':id')
  @RequirePermission('product.update')
  @ApiOperation({ summary: 'Update a product category' })
  @ApiOkResponse({ type: ProductCategoryDto })
  @ApiConflictResponse({ description: 'Category slug is already in use' })
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
    @Req() request: Request,
  ) {
    return this.categories.update(
      merchant.id,
      id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('product.delete')
  @ApiOperation({ summary: 'Archive a product category' })
  @ApiOkResponse({ type: ProductCategoryDto })
  archive(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.categories.archive(
      merchant.id,
      id,
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
