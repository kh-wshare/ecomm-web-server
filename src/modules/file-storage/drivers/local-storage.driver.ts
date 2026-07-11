import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import {
  StorageDriver,
  StoredFile,
  UploadContext,
  UploadFile,
} from '../file-storage.types';
import { buildStorageKey, encodeKeyPath } from './storage-key';

export class LocalStorageDriver implements StorageDriver {
  readonly provider = 'local';
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.rootDir = resolve(config.get<string>('storage.localDir') ?? 'uploads');
    this.publicBaseUrl =
      config.get<string>('storage.publicBaseUrl') ??
      `http://localhost:${config.get<number>('app.port', 3000)}/files`;
  }

  async upload(file: UploadFile, context: UploadContext): Promise<StoredFile> {
    const key = buildStorageKey({
      merchantId: context.merchantId,
      originalName: file.originalName,
      purpose: context.purpose,
    });
    const destination = this.safeDestination(key);

    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.buffer, { flag: 'wx' });

    return {
      contentType: file.mimeType,
      key,
      originalName: file.originalName,
      provider: this.provider,
      size: file.size,
      url: `${this.publicBaseUrl.replace(/\/+$/, '')}/${encodeKeyPath(key)}`,
    };
  }

  private safeDestination(key: string) {
    const destination = resolve(join(this.rootDir, key));
    if (!destination.startsWith(this.rootDir)) {
      throw new Error('Invalid storage key');
    }
    return destination;
  }
}
