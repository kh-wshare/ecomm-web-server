export type UploadVisibility = 'public' | 'private';

export type UploadFile = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
};

export type UploadContext = {
  merchantId: string;
  userId: string;
  purpose: string;
  visibility: UploadVisibility;
};

export type StoredFile = {
  bucket?: string;
  contentType: string;
  key: string;
  originalName: string;
  provider: string;
  size: number;
  url: string;
};

export interface StorageDriver {
  readonly provider: string;
  upload(file: UploadFile, context: UploadContext): Promise<StoredFile>;
}
