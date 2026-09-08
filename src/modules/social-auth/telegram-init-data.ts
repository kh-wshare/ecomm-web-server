import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type TelegramMiniAppUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  allowsWriteToPm?: boolean;
  photoUrl?: string;
};

type ParsedInitData = {
  pairs: Array<[string, string]>;
  hash: string;
  authDate: number;
  user: TelegramMiniAppUser;
};

export function parseTelegramInitData(initData: string): ParsedInitData {
  if (typeof initData !== 'string' || initData.trim().length === 0) {
    throw new BadRequestException({
      message: 'Invalid Telegram authentication data',
      code: 'INVALID_TELEGRAM_INIT_DATA',
    });
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    throw new BadRequestException({
      message: 'Invalid Telegram authentication data',
      code: 'INVALID_TELEGRAM_INIT_DATA',
    });
  }

  const hash = params.get('hash');
  const authDateRaw = params.get('auth_date');
  const userRaw = params.get('user');
  if (!hash || !authDateRaw || !userRaw) {
    throw new BadRequestException({
      message: 'Invalid Telegram authentication data',
      code: 'INVALID_TELEGRAM_INIT_DATA',
    });
  }

  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    throw new BadRequestException({
      message: 'Invalid Telegram authentication data',
      code: 'INVALID_TELEGRAM_INIT_DATA',
    });
  }

  let rawUser: {
    id?: unknown;
    first_name?: unknown;
    last_name?: unknown;
    username?: unknown;
    language_code?: unknown;
    allows_write_to_pm?: unknown;
    photo_url?: unknown;
  };
  try {
    rawUser = JSON.parse(userRaw) as typeof rawUser;
  } catch {
    throw new BadRequestException({
      message: 'Invalid Telegram authentication data',
      code: 'INVALID_TELEGRAM_INIT_DATA',
    });
  }
  if (
    typeof rawUser.id !== 'number' ||
    typeof rawUser.first_name !== 'string'
  ) {
    throw new BadRequestException({
      message: 'Invalid Telegram authentication data',
      code: 'INVALID_TELEGRAM_INIT_DATA',
    });
  }

  const pairs: Array<[string, string]> = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push([key, value]);
  }

  return {
    pairs,
    hash,
    authDate,
    user: {
      id: rawUser.id,
      firstName: rawUser.first_name,
      lastName:
        typeof rawUser.last_name === 'string' ? rawUser.last_name : undefined,
      username:
        typeof rawUser.username === 'string' ? rawUser.username : undefined,
      languageCode:
        typeof rawUser.language_code === 'string'
          ? rawUser.language_code
          : undefined,
      allowsWriteToPm:
        typeof rawUser.allows_write_to_pm === 'boolean'
          ? rawUser.allows_write_to_pm
          : undefined,
      photoUrl:
        typeof rawUser.photo_url === 'string' ? rawUser.photo_url : undefined,
    },
  };
}

export function assertValidTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
): TelegramMiniAppUser {
  const parsed = parseTelegramInitData(initData);

  const dataCheckString = parsed.pairs
    .slice()
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(parsed.hash, 'hex');
  const isValidSignature =
    expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!isValidSignature) {
    throw new UnauthorizedException({
      message: 'Invalid Telegram authentication data',
      code: 'INVALID_TELEGRAM_SIGNATURE',
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - parsed.authDate > maxAgeSeconds) {
    throw new UnauthorizedException({
      message: 'Telegram authentication data has expired',
      code: 'TELEGRAM_AUTH_DATA_EXPIRED',
    });
  }

  return parsed.user;
}
