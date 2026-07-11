import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import {
  StorageDriver,
  StoredFile,
  UploadContext,
  UploadFile,
} from '../file-storage.types';
import { bufferToBlob } from './buffer-to-blob';
import { buildStorageKey } from './storage-key';

type CloudinaryConfig = {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  folder?: string;
};

export class CloudinaryStorageDriver implements StorageDriver {
  readonly provider = 'cloudinary';
  private readonly options: CloudinaryConfig;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('storage.cloudinaryCloudName');
    const apiKey = config.get<string>('storage.cloudinaryApiKey');
    const apiSecret = config.get<string>('storage.cloudinaryApiSecret');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary storage requires cloud name, API key, and API secret',
      );
    }

    this.options = {
      apiKey,
      apiSecret,
      cloudName,
      folder: config.get<string>('storage.cloudinaryFolder'),
    };
  }

  async upload(file: UploadFile, context: UploadContext): Promise<StoredFile> {
    const key = buildStorageKey({
      merchantId: context.merchantId,
      originalName: file.originalName,
      purpose: context.purpose,
    });
    const publicId = key.replace(/\.[^.]+$/, '');
    const folder = this.options.folder;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.signature({ folder, publicId, timestamp });
    const form = new FormData();

    form.set('api_key', this.options.apiKey);
    form.set('timestamp', timestamp);
    form.set('signature', signature);
    form.set('public_id', publicId);
    if (folder) form.set('folder', folder);
    form.set(
      'file',
      bufferToBlob(file.buffer, file.mimeType),
      file.originalName,
    );

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.options.cloudName}/auto/upload`,
      {
        body: form,
        method: 'POST',
      },
    );
    const payload = (await response.json()) as {
      bytes?: number;
      public_id?: string;
      resource_type?: string;
      secure_url?: string;
    };
    if (!response.ok || !payload.secure_url || !payload.public_id) {
      throw new Error(`Cloudinary upload failed with ${response.status}`);
    }

    return {
      bucket: this.options.cloudName,
      contentType: file.mimeType,
      key: payload.public_id,
      originalName: file.originalName,
      provider: this.provider,
      size: payload.bytes ?? file.size,
      url: payload.secure_url,
    };
  }

  private signature(input: {
    folder?: string;
    publicId: string;
    timestamp: string;
  }) {
    const params = [
      input.folder ? `folder=${input.folder}` : null,
      `public_id=${input.publicId}`,
      `timestamp=${input.timestamp}`,
    ]
      .filter((value): value is string => Boolean(value))
      .join('&');
    return createHash('sha1')
      .update(`${params}${this.options.apiSecret}`)
      .digest('hex');
  }
}
