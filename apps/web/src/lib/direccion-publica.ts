import { headers } from "next/headers";

/**
 * La dirección pública del sitio, para las etiquetas que leen WhatsApp y Facebook: piden la imagen de la
 * vista previa con dirección completa, y sin ella Next pondría `localhost`.
 *
 * En el servidor manda `DOMAIN` (la misma variable con la que Caddy saca el certificado). Sin ella —en
 * pruebas o en la copia local— se toma la que trae la petición, como hace el botón de compartir.
 */
export function origenPublico(dominio: string | undefined, host: string | null, protocolo: string | null): URL {
  const configurado = dominio?.trim();
  if (configurado && configurado !== "localhost" && HOST_VALIDO.test(configurado)) return new URL(`https://${configurado}`);
  // Un Host raro (con ruta, usuario o espacios) no se usa: se cae a localhost en vez de armar una dirección ajena.
  const anfitrion = host && HOST_VALIDO.test(host) ? host : "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(anfitrion);
  const esquema = protocolo === "http" || protocolo === "https" ? protocolo : local ? "http" : "https";
  return new URL(`${esquema}://${anfitrion}`);
}

const HOST_VALIDO = /^[a-z0-9.-]+(:\d{1,5})?$/i;

export async function direccionPublica(): Promise<URL> {
  const cabeceras = await headers();
  return origenPublico(
    process.env.DOMAIN,
    cabeceras.get("x-forwarded-host") ?? cabeceras.get("host"),
    cabeceras.get("x-forwarded-proto")
  );
}
