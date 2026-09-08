import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import paymentConfig from './payment.config';
import redisConfig from './redis.config';
import socialAuthConfig from './social-auth.config';
import storageConfig from './storage.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        paymentConfig,
        storageConfig,
        socialAuthConfig,
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        APP_NAME: Joi.string().default('Merchant Commerce Hub'),
        APP_PREFIX: Joi.string().default('api'),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().uri().optional(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        JWT_SECRET: Joi.string().min(32).optional(),
        JWT_ACCESS_SECRET: Joi.string().min(32).optional(),
        JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        REFRESH_TOKEN_TTL_DAYS: Joi.number()
          .integer()
          .min(1)
          .max(90)
          .default(30),
        SWAGGER_ENABLED: Joi.boolean().optional(),
        SWAGGER_USER_ENABLED: Joi.boolean().optional(),
        SWAGGER_MERCHANT_ENABLED: Joi.boolean().optional(),
        SWAGGER_STOREFRONT_ENABLED: Joi.boolean().optional(),
        SWAGGER_ADMIN_ENABLED: Joi.boolean().optional(),
        FIREBASE_PROJECT_ID: Joi.string().optional(),
        TELEGRAM_CLIENT_ID: Joi.string().optional(),
        TELEGRAM_CLIENT_SECRET: Joi.string().optional(),
        TELEGRAM_ISSUER: Joi.string().uri().optional(),
        TELEGRAM_BOT_TOKEN: Joi.string().optional(),
        TELEGRAM_INIT_DATA_MAX_AGE: Joi.number().integer().min(1).optional(),
        PAYMENT_WEBHOOK_SECRET: Joi.string().min(16).optional(),
        PAYMENT_PROVIDER: Joi.string().optional(),
        PAYMENT_PROVIDER_API_KEY: Joi.string().optional(),
        PAYMENT_PROVIDER_PUBLIC_KEY: Joi.string().optional(),
        PAYMENT_CONFIG_ENCRYPTION_KEY: Joi.string().min(32).optional(),
        STORAGE_PROVIDER: Joi.string()
          .valid('local', 's3', 'cloudinary')
          .default('local'),
        STORAGE_ENDPOINT: Joi.string().uri().optional(),
        STORAGE_REGION: Joi.string().optional(),
        STORAGE_BUCKET: Joi.string().optional(),
        STORAGE_ACCESS_KEY: Joi.string().optional(),
        STORAGE_SECRET_KEY: Joi.string().optional(),
        STORAGE_LOCAL_DIR: Joi.string().default('uploads'),
        STORAGE_PUBLIC_BASE_URL: Joi.string().uri().optional(),
        STORAGE_MAX_FILE_SIZE_BYTES: Joi.number()
          .integer()
          .min(1)
          .default(10485760),
        STORAGE_ALLOWED_MIME_TYPES: Joi.string().optional(),
        CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
        CLOUDINARY_API_KEY: Joi.string().optional(),
        CLOUDINARY_API_SECRET: Joi.string().optional(),
        CLOUDINARY_FOLDER: Joi.string().optional(),
        DASHBOARD_FRONTEND_URL: Joi.string()
          .uri()
          .default('http://localhost:3000'),
        PUBLIC_STOREFRONT_URL: Joi.string()
          .uri()
          .default('http://localhost:3001'),
      })
        .or('JWT_ACCESS_SECRET', 'JWT_SECRET')
        .or('REDIS_URL', 'REDIS_HOST'),
      validationOptions: {
        abortEarly: true,
      },
    }),
  ],
})
export class AppConfigModule {}
