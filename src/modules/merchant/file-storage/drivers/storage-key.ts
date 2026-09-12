import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

export function buildStorageKey(input: {
  merchantId: string;
  originalName: string;
  purpose: string;
}) {
  const purpose = sanitizeSegment(input.purpose || 'media');
  const extension = sanitizeExtension(extname(input.originalName));
  return [
    'merchants',
    input.merchantId,
    purpose,
    new Date().toISOString().slice(0, 10),
    `${randomUUID()}${extension}`,
  ].join('/');
}

export function encodeKeyPath(key: string) {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function sanitizeSegment(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'media'
  );
}

function sanitizeExtension(value: string) {
  return /^[.][a-z0-9]{1,12}$/i.test(value) ? value.toLowerCase() : '';
}
