import { NextResponse, type NextRequest } from "next/server";
// Directo del módulo y no de `@tonala/ui`: el índice arrastra componentes de React al middleware.
import { getHomePathForRole } from "@tonala/ui/role-home.js";

import { CABECERA_ID_DE_PETICION } from "@/lib/registro";
import { getEdgeSession } from "@/lib/session-server";

// `/conoceme` es material de campaña: se comparte por WhatsApp y se abre en
// la puerta de una casa, así que tiene que verse sin cuenta.
// Los avisos legales también: el login obliga a aceptarlos y los enlaza, y sin sesión rebotaban al
// propio login (C8), así que nadie podía leer lo que se le pedía aceptar.
const publicPaths = new Set(["/", "/login", "/register", "/conoceme", "/terminos", "/privacidad"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Identificador de esta petición: viaja al código que la atiende (cabecera de la petición) y
  // vuelve al cliente (cabecera de la respuesta). Con él, el registro, `audit_logs` y el outbox
  // cuentan la historia de una petición concreta. Lo genera siempre el servidor: uno que mandara
  // el cliente se descarta, para que nadie meta texto a su gusto en el registro.
  const idDePeticion = crypto.randomUUID();
  const cabecerasDeLaPeticion = new Headers(request.headers);
  cabecerasDeLaPeticion.set(CABECERA_ID_DE_PETICION, idDePeticion);
  const seguir = () => {
    const respuesta = NextResponse.next({ request: { headers: cabecerasDeLaPeticion } });
    respuesta.headers.set(CABECERA_ID_DE_PETICION, idDePeticion);
    return respuesta;
  };
  const conId = <T extends Response>(respuesta: T): T => {
    respuesta.headers.set(CABECERA_ID_DE_PETICION, idDePeticion);
    return respuesta;
  };

  // Las fotos se guardan en `public/uploads`, y lo que hay en `public` Next lo entrega tal cual en
  // `/uploads/<nombre>`: con cualquier sesión, sin pasar por la guarda de `/api/uploads` que decide
  // quién puede ver cada archivo (A12). Comprobado en desarrollo: un líder de otra estructura bajaba
  // así la foto que la guarda le negaba. La única puerta es `/api/uploads/<nombre>`.
  if (pathname === "/uploads" || pathname.startsWith("/uploads/")) {
    return conId(new NextResponse("Not found", { status: 404 }));
  }

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
    return seguir();
  }

  const response = seguir();
  const session = await getEdgeSession(request, response);
  const isPublic = publicPaths.has(pathname);

  if (!session.isLoggedIn && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return conId(
        NextResponse.json({ error: "unauthorized", message: "Sesión no válida o expirada." }, { status: 401 })
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return conId(NextResponse.redirect(loginUrl));
  }

  if (session.isLoggedIn && pathname === "/login") {
    return conId(NextResponse.redirect(new URL(getHomePathForRole(session.roleKey), request.url)));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
