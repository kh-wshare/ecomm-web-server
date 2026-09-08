import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { assertValidTelegramInitData } from '../telegram-init-data';

const BOT_TOKEN = 'test-bot-token-1234567890:ABCDEF';

function buildInitData(authDate: number = Math.floor(Date.now() / 1000)) {
  const user = JSON.stringify({
    id: 12345,
    first_name: 'Jane',
    last_name: 'Doe',
    username: 'janedoe',
    language_code: 'en',
    allows_write_to_pm: true,
  });
  const fields: Record<string, string> = {
    query_id: 'AAH123',
    user,
    auth_date: String(authDate),
  };
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

describe('assertValidTelegramInitData', () => {
  it('accepts a validly signed initData payload', () => {
    const user = assertValidTelegramInitData(buildInitData(), BOT_TOKEN, 86400);
    expect(user).toEqual({
      id: 12345,
      firstName: 'Jane',
      lastName: 'Doe',
      username: 'janedoe',
      languageCode: 'en',
      allowsWriteToPm: true,
      photoUrl: undefined,
    });
  });

  it('rejects a tampered field', () => {
    const tampered = buildInitData().replace('AAH123', 'TAMPERED');
    expect(() =>
      assertValidTelegramInitData(tampered, BOT_TOKEN, 86400),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a signature produced with the wrong bot token', () => {
    expect(() =>
      assertValidTelegramInitData(buildInitData(), 'wrong-token', 86400),
    ).toThrow(UnauthorizedException);
  });

  it('rejects expired auth_date', () => {
    const oldAuthDate = Math.floor(Date.now() / 1000) - 100_000;
    expect(() =>
      assertValidTelegramInitData(buildInitData(oldAuthDate), BOT_TOKEN, 86400),
    ).toThrow(UnauthorizedException);
  });

  it('rejects malformed initData missing required fields', () => {
    expect(() =>
      assertValidTelegramInitData('foo=bar', BOT_TOKEN, 86400),
    ).toThrow(BadRequestException);
  });
});
