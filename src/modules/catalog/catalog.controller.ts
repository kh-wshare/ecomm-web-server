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
import { CatalogService } from './catalog.service';
import {
  CreateProductDto,
  UpdateChannelVisibilityDto,
  UpdateProductDto,
} from './dto/product-input.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  ProductChannelVisibilityDto,
  ProductDto,
} from './dto/product-response.dto';

type CurrentMerchantContext = { id: string };

@ApiTags('Catalog')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Merchant-ID', required: false })
@RequireMerchant()
@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  @RequirePermission('product.create')
  @ApiOperation({ summary: 'Create a product in the active merchant' })
  @ApiCreatedResponse({ type: ProductDto })
  @ApiConflictResponse({ description: 'SKU or slug is already in use' })
  create(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @Req() request: Request,
  ) {
    return this.catalogService.create(
      merchant.id,
      user.id,
      dto,
      this.metadata(request),
    );
  }

  @Get()
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'List products for the active merchant' })
  @ApiOkResponse({ type: [ProductDto] })
  findAll(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Query() query: ProductQueryDto,
  ) {
    return this.catalogService.findAll(merchant.id, query);
  }

  @Get(':id')
  @RequirePermission('product.read')
  @ApiOperation({ summary: 'Get a product from the active merchant' })
  @ApiOkResponse({ type: ProductDto })
  findOne(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.catalogService.findOne(merchant.id, id);
  }

  @Patch(':id')
  @RequirePermission('product.update')
  @ApiOperation({ summary: 'Update a product in the active merchant' })
  @ApiOkResponse({ type: ProductDto })
  @ApiConflictResponse({ description: 'SKU or slug is already in use' })
  update(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Req() request: Request,
  ) {
    return this.catalogService.update(
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
  @ApiOperation({ summary: 'Soft-delete a product in the active merchant' })
  @ApiOkResponse({ type: ProductDto })
  remove(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.catalogService.remove(
      merchant.id,
      id,
      user.id,
      this.metadata(request),
    );
  }

  @Patch(':id/channel-visibility')
  @RequirePermission('product.update')
  @ApiOperation({ summary: 'Update product visibility by sales channel' })
  @ApiOkResponse({ type: [ProductChannelVisibilityDto] })
  updateChannelVisibility(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChannelVisibilityDto,
    @Req() request: Request,
  ) {
    return this.catalogService.updateChannelVisibility(
      merchant.id,
      id,
      user.id,
      dto,
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
