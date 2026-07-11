import { createHash, createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import {
  StorageDriver,
  StoredFile,
  UploadContext,
  UploadFile,
} from '../file-storage.types';
import { bufferToBlob } from './buffer-to-blob';
import { buildStorageKey, encodeKeyPath } from './storage-key';

type S3Config = {
  accessKey: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl?: string;
  region: string;
  secretKey: string;
};

export class S3StorageDriver implements StorageDriver {
  readonly provider = 's3';
  private readonly options: S3Config;

  constructor(config: ConfigService) {
    const region = config.get<string>('storage.region') ?? 'us-east-1';
    const bucket = config.get<string>('storage.bucket');
    const accessKey = config.get<string>('storage.accessKey');
    const secretKey = config.get<string>('storage.secretKey');
    if (!bucket || !accessKey || !secretKey) {
      throw new Error('S3 storage requires bucket, access key, and secret key');
    }

    this.options = {
      accessKey,
      bucket,
      endpoint:
        config.get<string>('storage.endpoint') ??
        `https://s3.${region}.amazonaws.com`,
      publicBaseUrl: config.get<string>('storage.publicBaseUrl'),
      region,
      secretKey,
    };
  }

  async upload(file: UploadFile, context: UploadContext): Promise<StoredFile> {
    const key = buildStorageKey({
      merchantId: context.merchantId,
      originalName: file.originalName,
      purpose: context.purpose,
    });
    const url = this.objectUrl(key);
    const headers = this.signedHeaders({
      contentType: file.mimeType,
      payload: file.buffer,
      url,
    });

    const response = await fetch(url, {
      body: bufferToBlob(file.buffer, file.mimeType),
      headers,
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error(`S3 upload failed with ${response.status}`);
    }

    return {
      bucket: this.options.bucket,
      contentType: file.mimeType,
      key,
      originalName: file.originalName,
      provider: this.provider,
      size: file.size,
      url: this.publicUrl(key),
    };
  }

  private objectUrl(key: string) {
    return new URL(
      `${this.options.bucket}/${encodeKeyPath(key)}`,
      `${this.options.endpoint.replace(/\/+$/, '')}/`,
    );
  }

  private publicUrl(key: string) {
    if (this.options.publicBaseUrl) {
      return `${this.options.publicBaseUrl.replace(/\/+$/, '')}/${encodeKeyPath(
        key,
      )}`;
    }
    return this.objectUrl(key).toString();
  }

  private signedHeaders(input: {
    contentType: string;
    payload: Buffer;
    url: URL;
  }) {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = hashHex(input.payload);
    const host = input.url.host;
    const canonicalUri = input.url.pathname;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalHeaders = [
      `content-type:${input.contentType}`,
      `host:${host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
      '',
    ].join('\n');
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${this.options.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      hashHex(canonicalRequest),
    ].join('\n');
    const signingKey = getSignatureKey(
      this.options.secretKey,
      dateStamp,
      this.options.region,
      's3',
    );
    const signature = hmacHex(signingKey, stringToSign);

    return {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${this.options.accessKey}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'Content-Type': input.contentType,
      Host: host,
      'X-Amz-Content-Sha256': payloadHash,
      'X-Amz-Date': amzDate,
    };
  }
}

function hashHex(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest('hex');
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
) {
  const kDate = hmac(`AWS4${key}`, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}
