import { registerAs } from '@nestjs/config';

export default registerAs('socialAuth', () => ({
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  telegramClientId: process.env.TELEGRAM_CLIENT_ID,
  telegramIssuer: process.env.TELEGRAM_ISSUER ?? 'https://oauth.telegram.org',
}));
