import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "si_user_id";

export function middleware(request: NextRequest) {
  const userId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isProtected =
    request.nextUrl.pathname.startsWith("/browse") ||
    request.nextUrl.pathname.startsWith("/watch") ||
    request.nextUrl.pathname.startsWith("/channel");

  if (!userId && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (userId && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/browse";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
