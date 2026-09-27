/**
 * Helper para sanitizar errores antes de enviarlos al cliente en respuestas HTTP.
 * Previene filtración involuntaria de stack traces, consultas SQL y rutas internas.
 *
 * Drizzle envuelve todo error de consulta: el mensaje pasa a ser
 * `Failed query: <sql>\nparams: <valores>` —con el SQL en minúsculas— y el error original de `pg`
 * queda en `cause`. La versión anterior buscaba "SELECT"/"INSERT"/"UPDATE" en mayúsculas y solo en
 * el mensaje, así que un error corto de consulta llegaba al cliente tal cual, con la consulta y sus
 * valores (medido: un id mal formado devolvía `Failed query: select "id" from "contacts" … params:
 * no-es-uuid`). Y por la misma razón nunca reconocía un duplicado ni una base caída detrás de Drizzle.
 */

type ConCodigo = { code?: unknown };

function codigoDe(valor: unknown): string | undefined {
  const codigo = (valor as ConCodigo | null | undefined)?.code;
  return typeof codigo === "string" ? codigo : undefined;
}

const PARECE_SQL = /Failed query:|\bparams:|\b(select|insert\s+into|update|delete\s+from)\b/i;

export function safeErrorMessage(error: unknown, fallback: string = "Ha ocurrido un error en el servidor."): string {
  if (error instanceof Error) {
    const msg = error.message;
    const causa = error.cause instanceof Error ? error.cause : null;
    const textos = [msg, causa?.message ?? ""];
    const codigos = [codigoDe(error), codigoDe(causa)];

    if (
      codigos.some((c) => c === "ECONNREFUSED" || c === "ENOTFOUND") ||
      textos.some((t) => t.includes("connect ECONNREFUSED") || t.includes("ENOTFOUND"))
    ) {
      return "Error de conexión con la base de datos. Intente más tarde.";
    }
    if (
      codigos.includes("23505") ||
      textos.some((t) => t.includes("duplicate key") || t.includes("unique constraint"))
    ) {
      return "Este registro ya existe en el sistema.";
    }
    if (codigos.includes("23514") || textos.some((t) => t.includes("violates check constraint"))) {
      return "Los datos proporcionados no cumplen con las validaciones del sistema.";
    }
    // Si contiene SQL o paths internos de carpetas, no exponerlo
    if (PARECE_SQL.test(msg) || msg.includes("/") || msg.includes("\\")) {
      return fallback;
    }
    // Mensajes cortos y seguros controlados
    if (msg.length < 120) return msg;
  }
  return fallback;
}

export function apiError(message: string, status: number = 500) {
  const code =
    status === 401 ? "unauthorized" :
    status === 403 ? "forbidden" :
    status === 400 ? "validation_error" :
    status === 404 ? "not_found" : "internal_error";

  return Response.json({ code, error: message, message }, { status });
}
