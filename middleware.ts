import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "wp_auth";
const AUTH_TOKEN = "wp_publisher_authenticated";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API through without check
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE);
  if (cookie?.value !== AUTH_TOKEN) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
