import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER ?? 'local',
  endpoint: process.env.STORAGE_ENDPOINT,
  region: process.env.STORAGE_REGION,
  bucket: process.env.STORAGE_BUCKET,
  accessKey: process.env.STORAGE_ACCESS_KEY,
  secretKey: process.env.STORAGE_SECRET_KEY,
  localDir: process.env.STORAGE_LOCAL_DIR ?? 'uploads',
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  maxFileSizeBytes: Number(process.env.STORAGE_MAX_FILE_SIZE_BYTES ?? 10485760),
  allowedMimeTypes:
    process.env.STORAGE_ALLOWED_MIME_TYPES ??
    'image/jpeg,image/png,image/webp,image/gif,video/mp4,application/pdf',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER,
}));
