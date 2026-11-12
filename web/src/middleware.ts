import { NextResponse, type NextRequest } from "next/server";

const MAINTENANCE_PATH = "/maintenance";

export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== "true") {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === MAINTENANCE_PATH) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = MAINTENANCE_PATH;
  url.search = "";
  // 307: temporary, keeps search engines from caching the redirect.
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip Next internals and static files (anything with an extension).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.[\w]+$).*)"],
};
