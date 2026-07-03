import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  provider: process.env.PAYMENT_PROVIDER,
  apiKey: process.env.PAYMENT_PROVIDER_API_KEY,
  publicKey: process.env.PAYMENT_PROVIDER_PUBLIC_KEY,
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  encryptionKey:
    process.env.PAYMENT_CONFIG_ENCRYPTION_KEY ??
    process.env.JWT_ACCESS_SECRET ??
    process.env.JWT_SECRET,
}));
