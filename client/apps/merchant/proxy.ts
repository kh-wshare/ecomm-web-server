import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/inventory",
  "/orders",
  "/payments",
  "/products",
  "/settings",
  "/social-posts",
  "/storefront",
  "/merchant/dashboard",
  "/merchant/inventory",
  "/merchant/orders",
  "/merchant/payments",
  "/merchant/products",
  "/merchant/settings",
  "/merchant/social-posts",
  "/merchant/storefront",
];

const authPrefixes = ["/auth", "/merchant/auth"];
const sessionCookieNames = [
  "access_token",
  "auth_session",
  "merchant_session",
  "session",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (authPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected || hasSessionCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = pathname.startsWith("/merchant")
    ? "/merchant/auth/login"
    : "/auth/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/merchant/:path*",
    "/orders/:path*",
    "/payments/:path*",
    "/products/:path*",
    "/settings/:path*",
    "/social-posts/:path*",
    "/storefront/:path*",
  ],
};

function hasSessionCookie(request: NextRequest) {
  return sessionCookieNames.some((name) => request.cookies.has(name));
}
