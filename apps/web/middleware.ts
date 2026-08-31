import { NextResponse, type NextRequest } from "next/server";

import { getEdgeSession } from "@/lib/session-server";

const publicPaths = new Set(["/", "/login", "/register"]);

function getHomePathForRole(roleKey: string): string {
  switch (roleKey) {
    case "visit_responsible":
      return "/equipo";
    case "direction":
      return "/resumen";
    case "admin":
    case "territorial_coordinator":
    case "capturist":
      return "/crm/contacts";
    default:
      return "/crm/contacts";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth") || 
    pathname.startsWith("/api/public") || 
    pathname.startsWith("/api/catalog") ||
    pathname.startsWith("/api/map/geocode") ||
    pathname.startsWith("/api/map/reverse-geocode") ||
    pathname.startsWith("/api/map/sections") ||
    pathname.startsWith("/api/electoral/sections") ||
    pathname.startsWith("/api/crm/colonies") ||
    pathname.startsWith("/registro") || 
    pathname === "/api/health" || 
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getEdgeSession(request, response);
  const isPublic = publicPaths.has(pathname);

  if (!session.isLoggedIn && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "unauthorized", message: "Sesión no válida o expirada." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL(getHomePathForRole(session.roleKey), request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
