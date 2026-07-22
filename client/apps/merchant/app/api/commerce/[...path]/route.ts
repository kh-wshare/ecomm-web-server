import { NextResponse } from 'next/server';

import { clearMerchantSessionCookies } from '@/lib/auth/cookies';
import {
  getInternalApiUrl,
  missingInternalApiResponse,
} from '@/lib/api/server';

const allowedPrefixes = new Set([
  'branches',
  'inventory',
  'merchant',
  'notifications',
  'orders',
  'payments',
  'categories',
  'products',
  'social-posts',
  'themes',
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardCommerceRequest(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardCommerceRequest(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardCommerceRequest(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardCommerceRequest(request, context);
}

async function forwardCommerceRequest(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path.length || !allowedPrefixes.has(path[0] ?? '')) {
    return NextResponse.json(
      { message: 'Unsupported commerce resource', statusCode: 404 },
      { status: 404 },
    );
  }

  const accessToken = cookieValue(
    request.headers.get('cookie'),
    'access_token',
  );
  if (!accessToken) {
    return NextResponse.json(
      { message: 'Missing merchant session', statusCode: 401 },
      { status: 401 },
    );
  }

  const apiBaseUrl = getInternalApiUrl();
  if (!apiBaseUrl) return missingInternalApiResponse();

  const targetUrl = new URL(
    `/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`,
    apiBaseUrl,
  );
  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text();
  const response = await fetch(targetUrl, {
    body,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    method: request.method,
  });
  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  const forwarded = NextResponse.json(payload, { status: response.status });
  if (response.status === 401) clearMerchantSessionCookies(forwarded);

  return forwarded;
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
