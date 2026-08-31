/**
 * Helper para sanitizar errores antes de enviarlos al cliente en respuestas HTTP.
 * Previene filtración involuntaria de stack traces, consultas SQL y rutas internas.
 */

export function safeErrorMessage(error: unknown, fallback: string = "Ha ocurrido un error en el servidor."): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("connect ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      return "Error de conexión con la base de datos. Intente más tarde.";
    }
    if (msg.includes("duplicate key") || msg.includes("unique constraint") || msg.includes("23505")) {
      return "Este registro ya existe en el sistema.";
    }
    if (msg.includes("violates check constraint")) {
      return "Los datos proporcionados no cumplen con las validaciones del sistema.";
    }
    // Si contiene SQL o paths internos de carpetas, no exponerlo
    if (msg.includes("/") || msg.includes("\\") || msg.includes("SELECT") || msg.includes("INSERT") || msg.includes("UPDATE")) {
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
