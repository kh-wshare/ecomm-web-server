import {
  Controller,
  Get,
  Header,
  Body,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '#app/modules/authenticated/decorators/public.decorator';
import { CurrentMerchant } from '#app/modules/authenticated/decorators/current-merchant.decorator';
import { CurrentUser } from '#app/modules/authenticated/decorators/current-user.decorator';
import type { AuthenticatedUser } from '#app/modules/authenticated/interfaces/authenticated-user.interface';
import { RequireMerchant } from '#app/modules/authorization/decorators/require-merchant.decorator';
import { RequirePermission } from '#app/modules/authorization/decorators/require-permission.decorator';
import { UploadFileDto, UploadedFileDto } from './dto/file-upload.dto';
import { FileStorageService } from './file-storage.service';

type CurrentMerchantContext = { id: string };
type MulterFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@ApiTags('Files')
@Controller('files')
export class FileStorageController {
  constructor(private readonly files: FileStorageService) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Merchant-ID', required: false })
  @RequireMerchant()
  @RequirePermission('merchant.read')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: Number(process.env.STORAGE_MAX_FILE_SIZE_BYTES ?? 10485760),
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: { type: 'string', default: 'media' },
        visibility: {
          type: 'string',
          enum: ['public', 'private'],
          default: 'public',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload a merchant file' })
  @ApiOkResponse({ type: UploadedFileDto })
  upload(
    @CurrentMerchant() merchant: CurrentMerchantContext,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: MulterFile | undefined,
    @Body() body: UploadFileDto,
  ) {
    return this.files.upload(
      file
        ? {
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalName: file.originalname,
            size: file.size,
          }
        : undefined,
      {
        merchantId: merchant.id,
        purpose: body.purpose,
        userId: user.id,
        visibility: body.visibility,
      },
    );
  }

  @Public()
  @Get('merchants/:merchantId/:purpose/:date/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  streamLocalFile(
    @Param('merchantId') merchantId: string,
    @Param('purpose') purpose: string,
    @Param('date') date: string,
    @Param('filename') filename: string,
    @Res() response: Response,
  ) {
    const stream = this.files.getLocalFileStream(
      ['merchants', merchantId, purpose, date, filename].join('/'),
    );
    stream.pipe(response);
  }
}
