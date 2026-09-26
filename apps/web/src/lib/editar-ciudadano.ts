import { and, eq, sql } from "drizzle-orm";

import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { huellaDeTelefono, normalizarTelefono, schema } from "@tonala/shared/database";

import { permissionChecker } from "@/lib/api-helpers";
import { fechaDeNacimiento } from "@/lib/alta-ciudadano";
import { veCiudadano } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { avisoSiTelefonoRepetido } from "@/lib/telefono-repetido";

/**
 * Corregir los datos personales de un ciudadano ya registrado.
 *
 * No había forma de hacerlo: la ficha solo dejaba corregir colonia y sección, así que un teléfono mal
 * tecleado en un evento se quedaba así para siempre —y con él la búsqueda por teléfono y el aviso de
 * repetidos—. Decisión del dueño (2026-09-26): corrige quien puede registrar (capturista, líder,
 * dirección, administración), solo sobre ciudadanos que ya ve, y cada cambio queda en la auditoría.
 * El brigadista sigue corrigiendo solo el domicilio (`/territory`), que es lo que descubre en la puerta.
 *
 * Cada campo que no llega se deja como está. La ficha manda la versión que leyó: si alguien más la
 * cambió mientras tanto, se responde 409 en vez de pisar su corrección.
 */

export type CambiosCiudadano = {
  /** La `version` de la ficha que se tenía a la vista al editar. */
  version: number;
  firstName?: string | undefined;
  lastName?: string | null | undefined;
  maternalLastName?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  /** Día y mes van juntos; `null` en los dos borra la fecha. El año es opcional (D4). */
  birthDay?: number | null | undefined;
  birthMonth?: number | null | undefined;
  birthYear?: number | null | undefined;
  address?: string | null | undefined;
  addressNumber?: string | null | undefined;
  /** Quien corrige ya vio el aviso de teléfono repetido y confirma que es otra persona. */
  confirmarTelefonoRepetido?: boolean | undefined;
};

export type ResultadoEdicion =
  | { ok: true; version: number; cambios: string[] }
  | { ok: false; status: number; code: string; message: string; campo?: string | undefined; contactoExistenteId?: string | undefined };

const fallo = (status: number, code: string, message: string, campo?: string): ResultadoEdicion => ({ ok: false, status, code, message, campo });

const limpio = (v: string | null | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

/**
 * Lo que queda en `audit_logs` de cada campo. Teléfono, correo y domicilio van cifrados en la ficha:
 * escribirlos en claro en la auditoría deshacía ese cifrado para cualquiera con acceso a la base o a
 * un respaldo. Se guarda lo justo para reconocer el cambio. El nombre y la fecha ya están en claro
 * en la ficha (`display_name`, `birth_date`).
 */
function paraLaAuditoria(campo: string, valor: string | null): string | null {
  if (valor === null) return null;
  if (campo === "phone") {
    const digitos = normalizarTelefono(valor) ?? "";
    return digitos.length > 4 ? `•••${digitos.slice(-4)}` : "•••";
  }
  if (campo === "email") {
    const [usuario = "", dominio = ""] = valor.split("@");
    return `${usuario.slice(0, 1)}•••@${dominio}`;
  }
  if (campo === "address" || campo === "addressNumber") return "(cifrado)";
  return valor;
}

function fechaComoTexto(fecha: Date | null, anioConocido: boolean): string | null {
  if (!fecha) return null;
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return anioConocido ? `${dia}/${mes}/${fecha.getUTCFullYear()}` : `${dia}/${mes}`;
}

export async function editarCiudadano(actor: ActorContext, contactId: string, c: CambiosCiudadano): Promise<ResultadoEdicion> {
  if (!requirePermission(actor, Permission.ContactsCreate, permissionChecker).ok) {
    return fallo(403, "forbidden", "Tu rol no corrige los datos de un ciudadano. Si ves un error, avisa a quien lidera tu brigada.");
  }
  const noEncontrado = fallo(404, "contact_not_found", "El ciudadano no fue encontrado o no pertenece a tu estructura.");
  if (!esUuid(contactId)) return noEncontrado;
  const alcance = await resolveUserNetworkScope(actor.actorId);
  if (!(await veCiudadano(alcance, contactId))) return noEncontrado;

  const db = getDatabaseClient();
  const C = schema.contacts;
  const [actual] = await db
    .select({
      displayName: C.displayName,
      firstName: C.firstName,
      lastName: C.lastName,
      maternalLastName: C.maternalLastName,
      phone: C.phone,
      email: C.email,
      birthDate: C.birthDate,
      birthYearKnown: C.birthYearKnown,
      address: C.address,
      addressNumber: C.addressNumber,
      status: C.status,
      version: C.version
    })
    .from(C)
    .where(eq(C.id, contactId))
    .limit(1);
  if (!actual || actual.status !== "active") return noEncontrado;
  if (actual.version !== c.version) {
    return fallo(409, "version_conflict", "Alguien más cambió esta ficha mientras la editabas. Vuelve a abrirla para ver sus cambios y corrige de nuevo.");
  }

  const antes: Record<string, string | null> = {};
  const despues: Record<string, string | null> = {};
  const set: Partial<typeof C.$inferInsert> = {};
  const anotar = (campo: string, previo: string | null, nuevo: string | null) => {
    if ((previo ?? null) === nuevo) return;
    antes[campo] = paraLaAuditoria(campo, previo ?? null);
    despues[campo] = paraLaAuditoria(campo, nuevo);
  };

  // Nombre: las tres partes, y el nombre visible que sale de ellas (el que usan el directorio y la
  // búsqueda). Una ficha antigua sin partes guarda solo `display_name`: la primera corrección las crea.
  if (c.firstName !== undefined || c.lastName !== undefined || c.maternalLastName !== undefined) {
    const firstName = c.firstName !== undefined ? limpio(c.firstName) : actual.firstName;
    const lastName = c.lastName !== undefined ? limpio(c.lastName) : actual.lastName;
    const maternalLastName = c.maternalLastName !== undefined ? limpio(c.maternalLastName) : actual.maternalLastName;
    if (!firstName) return fallo(400, "nombre_requerido", "El nombre es obligatorio.", "firstName");
    for (const [campo, valor] of [["firstName", firstName], ["lastName", lastName], ["maternalLastName", maternalLastName]] as const) {
      if (valor && valor.length > 120) return fallo(400, "nombre_largo", "Cada parte del nombre puede tener hasta 120 caracteres.", campo);
    }
    anotar("firstName", actual.firstName, firstName);
    anotar("lastName", actual.lastName, lastName);
    anotar("maternalLastName", actual.maternalLastName, maternalLastName);
    set.firstName = firstName;
    set.lastName = lastName;
    set.maternalLastName = maternalLastName;
    set.displayName = [firstName, lastName, maternalLastName].filter(Boolean).join(" ");
    anotar("displayName", actual.displayName, set.displayName);
  }

  let telefonoCambia = false;
  if (c.phone !== undefined) {
    const phone = limpio(c.phone);
    if (phone && phone.length > 30) return fallo(400, "telefono_invalido", "El teléfono es demasiado largo.", "phone");
    if (phone && !normalizarTelefono(phone)) return fallo(400, "telefono_invalido", "Revisa el teléfono: no tiene ningún número.", "phone");
    telefonoCambia = normalizarTelefono(phone) !== normalizarTelefono(actual.phone);
    anotar("phone", actual.phone, phone);
    set.phone = phone;
    set.phoneHash = huellaDeTelefono(phone);
  }

  if (c.email !== undefined) {
    const email = limpio(c.email);
    if (email && (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return fallo(400, "correo_invalido", "El correo no es válido.", "email");
    anotar("email", actual.email, email);
    set.email = email;
  }

  if (c.birthDay !== undefined || c.birthMonth !== undefined || c.birthYear !== undefined) {
    const dia = c.birthDay ?? null;
    const mes = c.birthMonth ?? null;
    const anio = c.birthYear ?? null;
    let fecha: Date | null = null;
    if (dia !== null || mes !== null || anio !== null) {
      if (dia === null || mes === null) return fallo(400, "fecha_incompleta", "Indica día y mes de nacimiento.", "birthDay");
      if (anio !== null && (anio < 1900 || anio > new Date().getFullYear())) return fallo(400, "fecha_invalida", "Ese año de nacimiento no es válido.", "birthYear");
      fecha = fechaDeNacimiento(dia, mes, anio ?? undefined);
      if (!fecha) return fallo(400, "fecha_invalida", "Esa fecha de nacimiento no existe.", "birthDay");
    }
    const anioConocido = fecha === null || anio !== null;
    anotar("birthDate", fechaComoTexto(actual.birthDate, actual.birthYearKnown), fechaComoTexto(fecha, anioConocido));
    set.birthDate = fecha;
    set.birthYearKnown = anioConocido;
  }

  if (c.address !== undefined) {
    const address = limpio(c.address);
    if (address && address.length > 300) return fallo(400, "domicilio_largo", "La calle puede tener hasta 300 caracteres.", "address");
    anotar("address", actual.address, address);
    set.address = address;
  }
  if (c.addressNumber !== undefined) {
    const addressNumber = limpio(c.addressNumber);
    if (addressNumber && addressNumber.length > 40) return fallo(400, "numero_largo", "El número puede tener hasta 40 caracteres.", "addressNumber");
    anotar("addressNumber", actual.addressNumber, addressNumber);
    set.addressNumber = addressNumber;
  }

  const cambios = Object.keys(despues);
  if (cambios.length === 0) return { ok: true, version: actual.version, cambios: [] };

  // Después de validar todo: el aviso pide una decisión, no una corrección.
  if (telefonoCambia && !c.confirmarTelefonoRepetido) {
    const aviso = await avisoSiTelefonoRepetido(alcance, set.phone, contactId);
    if (aviso) return aviso;
  }

  const nuevaVersion = await db.transaction(async (tx) => {
    const [fila] = await tx
      .update(C)
      .set({ ...set, version: sql`${C.version} + 1` })
      .where(and(eq(C.id, contactId), eq(C.version, actual.version)))
      .returning({ version: C.version });
    if (!fila) return null;
    await tx.insert(schema.auditLogs).values({
      actorUserId: actor.actorId,
      action: "contacts.update",
      entityType: "contact",
      entityId: contactId,
      correlationId: actor.correlationId,
      beforeData: antes,
      afterData: despues
    });
    return fila.version;
  });
  if (nuevaVersion === null) {
    return fallo(409, "version_conflict", "Alguien más cambió esta ficha mientras la editabas. Vuelve a abrirla para ver sus cambios y corrige de nuevo.");
  }
  return { ok: true, version: nuevaVersion, cambios };
}
