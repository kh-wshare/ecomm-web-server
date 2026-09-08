import { registerAs } from '@nestjs/config';

export default registerAs('socialAuth', () => ({
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  telegramClientId: process.env.TELEGRAM_CLIENT_ID,
  telegramClientSecret: process.env.TELEGRAM_CLIENT_SECRET,
  telegramIssuer: process.env.TELEGRAM_ISSUER ?? 'https://oauth.telegram.org',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramInitDataMaxAgeSeconds: Number(
    process.env.TELEGRAM_INIT_DATA_MAX_AGE ?? 86400,
  ),
}));
