/**
 * Rate Limiter en memoria ligero para endpoints de autenticación y registros públicos.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Limpieza periódica de claves expiradas cada 60 segundos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (val.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Verifica si una clave (IP, userId, etc.) está dentro de su límite de peticiones.
 * @param key Identificador de la petición (ej. `login:192.168.1.1`)
 * @param maxRequests Máximo número de intentos permitidos
 * @param windowMs Ventana de tiempo en milisegundos
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now };
  }
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    {
      code: "rate_limited",
      error: "Demasiados intentos. Por favor espera un momento antes de reintentar.",
      message: "Demasiados intentos. Por favor espera un momento antes de reintentar."
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
        "X-RateLimit-Remaining": String(result.remaining)
      }
    }
  );
}
