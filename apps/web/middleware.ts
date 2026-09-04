import { NextResponse, type NextRequest } from "next/server";

import { getEdgeSession } from "@/lib/session-server";

// `/conoceme` es material de campaña: se comparte por WhatsApp y se abre en
// la puerta de una casa, así que tiene que verse sin cuenta.
const publicPaths = new Set(["/", "/login", "/register", "/conoceme"]);

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
    // El catálogo de secciones y colonias dejó de ser público: devolvía el
    // conteo de contactos por sección a cualquiera, con o sin sesión. Ninguna
    // página pública lo necesita; el registro ciudadano solo usa
    // /api/public/registro. Las páginas internas que sí lo consultan van con
    // sesión y pasan igual.
    pathname.startsWith("/registro") ||
    // El QR de "súmate a mi brigada": quien lo escanea todavía no tiene cuenta.
    pathname.startsWith("/unirme") ||
    pathname.startsWith("/api/public/unirme") ||
    pathname === "/api/health" ||
    // Material gráfico de campaña. Sin esto el middleware redirige las imágenes
    // al login para quien no tiene sesión, que es justo todo el que ve el login,
    // la página de registro público o los avisos legales: las fotos nunca
    // cargaban en ninguna página pública.
    pathname.startsWith("/media") ||
    pathname.startsWith("/brand") ||
    // Iconos que Next genera desde app/icon.png y app/apple-icon.png. Sin esto
    // el navegador los pide sin sesión, se los redirige al login y la pestaña
    // se queda con el icono genérico en todas las páginas públicas.
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
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
