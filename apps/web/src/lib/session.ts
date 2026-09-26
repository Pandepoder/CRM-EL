import type { SessionOptions } from "iron-session";

export type SessionData = Readonly<{
  userId: string;
  email: string;
  displayName: string;
  roleKey: string;
  roleName: string;
  isLoggedIn: boolean;
  /**
   * `user_profiles.session_version` al iniciar sesión (0023). Si en la base ya es otra —le cambiaron el
   * rol, el estado, la contraseña o, a administración, el municipio—, esta sesión deja de valer.
   * Las cookies de antes de la 0023 no la traen y valen como 1, el valor con que nace toda cuenta: nadie
   * queda fuera al desplegar.
   */
  sessionVersion: number;
}>;

export const defaultSession: SessionData = {
  userId: "",
  email: "",
  displayName: "",
  roleKey: "",
  roleName: "",
  isLoggedIn: false,
  sessionVersion: 1
};

function sessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set with at least 32 characters.");
  }
  return secret;
}

const SEGUNDOS_POR_HORA = 3600;
const HORAS_POR_OMISION = 7 * 24;
const HORAS_MAXIMAS = 30 * 24;

/**
 * Cuánto dura una sesión desde que se inicia.
 *
 * No estaba fijado, así que regía el valor por omisión de iron-session: 14 días. En teléfonos de
 * brigada —que se prestan, se pierden o se quedan en la mesa de una casa de campaña— eso son dos
 * semanas de acceso al padrón para quien lo encuentre. Por omisión queda en 7 días: una entrada
 * a la semana no estorba en campo y reduce a la mitad esa ventana. Se ajusta con
 * SESSION_TTL_HOURS.
 *
 * No es el mecanismo para echar a alguien: quitarle el acceso a una persona ya surte efecto en
 * la siguiente petición, porque `actorFromSession` relee su rol y su estado en la base, y compara la
 * versión de la sesión (0023).
 *
 * Las sesiones abiertas antes del cambio no se cierran: cada cookie lleva sellada su propia
 * caducidad y la conserva.
 *
 * Se lee de `process.env` y no del esquema de `@tonala/config` porque esto también corre en el
 * middleware, igual que SESSION_SECRET.
 */
function duracionDeSesionEnSegundos(): number {
  const crudo = process.env.SESSION_TTL_HOURS?.trim();
  if (!crudo) return HORAS_POR_OMISION * SEGUNDOS_POR_HORA;

  const horas = Number(crudo);
  if (!Number.isInteger(horas) || horas < 1 || horas > HORAS_MAXIMAS) {
    throw new Error(`SESSION_TTL_HOURS debe ser un número entero de horas entre 1 y ${HORAS_MAXIMAS}; se recibió "${crudo}".`);
  }
  return horas * SEGUNDOS_POR_HORA;
}

export function getSessionOptions(): SessionOptions {
  return {
    password: sessionPassword(),
    cookieName: "tonala_session",
    // Solo `ttl`: iron-session deriva de ahí la caducidad de la cookie (ttl − 60 s). Pasar
    // `cookieOptions.maxAge` a mano rompe esa derivación, y pasarlo como `undefined` la convierte
    // en una sesión SIN caducidad (iron-session pone ttl = 0). Comprobado en su código fuente.
    ttl: duracionDeSesionEnSegundos(),
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    }
  };
}
