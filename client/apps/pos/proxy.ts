import { NextResponse, type NextRequest } from "next/server";

const POS_SESSION_COOKIE = "pos_session";

const sessionPaths = [
  "/pos/api/session/login",
  "/pos/api/session/logout",
  "/pos/api/session/me",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (sessionPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/pos/api/")) {
    if (request.cookies.has(POS_SESSION_COOKIE)) return NextResponse.next();

    return NextResponse.json(
      { message: "Missing POS session", statusCode: 401 },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/api/:path*"],
};
