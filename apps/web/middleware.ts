import { NextResponse, type NextRequest } from "next/server";

import { getEdgeSession } from "@/lib/session-server";
import { isPublicRegistrationAllowed } from "@/lib/registration-policy";

const publicPaths = new Set(["/", "/login", "/register"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (pathname === "/register" && !isPublicRegistrationAllowed()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  const session = await getEdgeSession(request, response);
  const isPublic = publicPaths.has(pathname);

  if (!session.isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.isLoggedIn && pathname === "/login") {
    const { getHomePathForRole } = await import("@tonala/ui");
    return NextResponse.redirect(new URL(getHomePathForRole(session.roleKey), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
