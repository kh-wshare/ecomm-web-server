import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET,
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ??
    process.env.JWT_ACCESS_SECRET ??
    process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10),
}));
