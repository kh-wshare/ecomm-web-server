import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CloudinaryStorageDriver } from './drivers/cloudinary-storage.driver';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { S3StorageDriver } from './drivers/s3-storage.driver';
import {
  StorageDriver,
  StoredFile,
  UploadContext,
  UploadFile,
} from './file-storage.types';

@Injectable()
export class FileStorageService {
  private readonly allowedMimeTypes: Set<string>;
  private readonly driver: StorageDriver;
  private readonly localRootDir: string;
  private readonly maxFileSizeBytes: number;

  constructor(private readonly config: ConfigService) {
    this.allowedMimeTypes = new Set(
      (config.get<string>('storage.allowedMimeTypes') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
    this.maxFileSizeBytes =
      config.get<number>('storage.maxFileSizeBytes') ?? 10 * 1024 * 1024;
    this.localRootDir = resolve(
      config.get<string>('storage.localDir') ?? 'uploads',
    );
    this.driver = this.createDriver(config.get<string>('storage.provider'));
  }

  upload(file: UploadFile | undefined, context: UploadContext) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    this.validate(file);
    return this.driver.upload(file, context);
  }

  getLocalFileStream(key: string) {
    if (this.driver.provider !== 'local') {
      throw new NotFoundException('File not found');
    }
    const filePath = resolve(this.localRootDir, key);
    if (!filePath.startsWith(this.localRootDir) || !existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return createReadStream(filePath);
  }

  private validate(file: UploadFile) {
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('File is too large');
    }
    if (
      this.allowedMimeTypes.size &&
      !this.allowedMimeTypes.has(file.mimeType)
    ) {
      throw new BadRequestException('File type is not allowed');
    }
  }

  private createDriver(provider = 'local'): StorageDriver {
    switch (provider) {
      case 'local':
        return new LocalStorageDriver(this.config);
      case 's3':
        return new S3StorageDriver(this.config);
      case 'cloudinary':
        return new CloudinaryStorageDriver(this.config);
      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }
}

export type { StoredFile };
