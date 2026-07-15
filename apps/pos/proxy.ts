import { NextResponse, type NextRequest } from "next/server";

const POS_SESSION_COOKIE = "pos_session";

const sessionPaths = [
  "/pos/api/session/login",
  "/pos/api/session/logout",
  "/pos/api/session/me",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (sessionPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/pos/api/") ||
    pathname === "/pos" ||
    pathname === "/"
  ) {
    if (request.cookies.has(POS_SESSION_COOKIE)) return NextResponse.next();

    if (pathname.startsWith("/pos/api/")) {
      return NextResponse.json(
        { message: "Missing POS session", statusCode: 401 },
        { status: 401 },
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/pos";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.rewrite(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/pos", "/pos/api/:path*"],
};
