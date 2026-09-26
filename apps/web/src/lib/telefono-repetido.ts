import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";

import { esValorCifrado, huellaDeTelefono, normalizarTelefono, schema } from "@tonala/shared/database";

import { veCiudadano } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { type UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * ¿Hay otro ciudadano activo con este teléfono?
 *
 * El registro público (QR, modo evento) rechaza un teléfono repetido: ahí no hay nadie que pueda
 * decidir si es la misma persona. En el panel sí lo hay, y hay números compartidos legítimos —una
 * familia con un solo teléfono—, así que el alta y la corrección de datos **avisan** y dejan seguir
 * cuando quien captura confirma que es otra persona (decisión del dueño, 2026-09-26). Antes el alta
 * del panel no miraba nada: quien ya se había registrado por el QR quedaba con dos fichas.
 *
 * Se busca por la huella (`phone_hash`, 0019), con índice; las filas que aún no la tienen —el relleno
 * de `pnpm db:migrate` sin terminar— se revisan aparte, como en el registro público.
 *
 * @returns el id del primero que coincide, o `null`.
 */
export async function ciudadanoConElTelefono(telefono: string, excepto?: string): Promise<string | null> {
  const digitos = normalizarTelefono(telefono);
  const huella = digitos ? huellaDeTelefono(digitos) : null;
  if (!digitos || !huella) return null;
  const c = schema.contacts;
  const db = getDatabaseClient();
  const otro = excepto ? ne(c.id, excepto) : undefined;

  const [porHuella] = await db
    .select({ id: c.id })
    .from(c)
    .where(and(eq(c.phoneHash, huella), eq(c.status, "active"), otro))
    .limit(1);
  if (porHuella) return porHuella.id;

  const sinHuella = await db
    .select({ id: c.id, phone: c.phone })
    .from(c)
    .where(and(isNull(c.phoneHash), isNotNull(c.phone), eq(c.status, "active"), otro));
  return sinHuella.find((f) => !esValorCifrado(f.phone) && normalizarTelefono(f.phone) === digitos)?.id ?? null;
}

export type AvisoDeTelefonoRepetido = {
  ok: false;
  status: 409;
  code: "telefono_repetido";
  message: string;
  campo: "phone";
  /** Solo si quien captura puede abrir esa ficha: a los demás no se les dice de quién es. */
  contactoExistenteId?: string | undefined;
};

/** El aviso, o `null` si el teléfono no está en otra ficha activa. */
export async function avisoSiTelefonoRepetido(
  alcance: UserNetworkScope,
  telefono: string | null | undefined,
  excepto?: string
): Promise<AvisoDeTelefonoRepetido | null> {
  if (!telefono?.trim()) return null;
  const existente = await ciudadanoConElTelefono(telefono, excepto);
  if (!existente) return null;
  const loVe = await veCiudadano(alcance, existente);
  return {
    ok: false,
    status: 409,
    code: "telefono_repetido",
    campo: "phone",
    message: loVe
      ? "Ya hay un ciudadano con ese teléfono. Revisa su ficha: si es otra persona (por ejemplo, una familia que comparte teléfono), puedes guardar de todos modos."
      : "Ese teléfono ya está registrado con otro ciudadano. Si es otra persona (por ejemplo, una familia que comparte teléfono), puedes guardar de todos modos.",
    contactoExistenteId: loVe ? existente : undefined
  };
}
