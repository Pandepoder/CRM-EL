import { registerExtendedContact, type ExtendedContactSurvey } from "@tonala/modules/contacts/application";
import { Permission, requirePermission, type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";
import { TonalaOsError, toSafeHttpError } from "@tonala/shared/errors";
import { DevelopmentLogger } from "@tonala/shared/observability";
import { eq } from "drizzle-orm";

import { permissionChecker } from "@/lib/api-helpers";
import { motivoSiAdjuntosAjenos } from "@/lib/archivos";
import { createExtendedContactsMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { crearUnaSolaVez } from "@/lib/idempotencia";
import { esUuid } from "@/lib/ids";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { processOutboxInline } from "@/lib/outbox";
import { avisoSiTelefonoRepetido } from "@/lib/telefono-repetido";
import { vincularTerritorioDelAlta } from "@/lib/territorio-del-alta";

/**
 * Alta de un ciudadano desde el panel (`/crm/nuevo`, `POST /api/crm/contacts`).
 *
 * Antes era una acción de servidor que se enviaba con el formulario y **lanzaba** sus errores. En
 * producción Next oculta el mensaje de lo que lanza una acción, y el error llevaba a la pantalla de
 * fallo: una sección mal tecleada hacía perder todo lo capturado, sin decir por qué. Tampoco era
 * atómica —el alta, los datos de campo, la nota y la encuesta iban en cuatro escrituras sueltas— ni
 * idempotente: un reintento tras un corte de señal creaba otro ciudadano (R16).
 *
 * Ahora devuelve el error, con el campo que lo causó, todo va en una transacción y la clave del
 * formulario (`clientRequestId`) hace que un reintento devuelva el mismo ciudadano.
 */

export type EntradaCiudadano = {
  firstName?: string | undefined;
  lastName?: string | undefined;
  maternalLastName?: string | undefined;
  /** Solo si no vienen nombre y apellidos por separado (clientes anteriores de la API). */
  displayName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  birthDay?: number | undefined;
  birthMonth?: number | undefined;
  birthYear?: number | undefined;
  address?: string | undefined;
  addressNumber?: string | undefined;
  colony?: string | undefined;
  municipality?: string | undefined;
  sectionNum?: number | undefined;
  sectionId?: string | undefined;
  profession?: string | undefined;
  companyOrWork?: string | undefined;
  yearsKnown?: number | undefined;
  skill?: string | undefined;
  availability?: string | undefined;
  interests?: string | undefined;
  pastSupport?: string | undefined;
  referredByUserId?: string | undefined;
  actualContactUserId?: string | undefined;
  origin?: string | undefined;
  firstContactDate?: string | undefined;
  preferredContactMethod?: string | undefined;
  preferredContactTime?: string | undefined;
  panMilitancy?: string | undefined;
  panMilitancyVerifiedAt?: string | undefined;
  knowMeBetter?: string | undefined;
  bardaPhotoUrl?: string | undefined;
  exactLatitude?: number | undefined;
  exactLongitude?: number | undefined;
  initialNote?: string | undefined;
  survey?: ExtendedContactSurvey | undefined;
  clientRequestId?: string | undefined;
  /**
   * Quien captura ya vio el aviso de teléfono repetido y confirmó que es otra persona (una familia
   * que comparte teléfono). Sin esto, un teléfono que ya está en otra ficha se contesta con el aviso.
   */
  confirmarTelefonoRepetido?: boolean | undefined;
};

export type ResultadoAlta =
  | { ok: true; contactId: string; repetido: boolean }
  | { ok: false; status: number; code: string; message: string; campo?: string | undefined; contactoExistenteId?: string | undefined };

const rechazo = (code: string, message: string, campo?: string, status = 400): ResultadoAlta => ({ ok: false, status, code, message, campo });

/** Los valores que ofrece el formulario. Un texto inventado ensuciaba filtros y conteos. */
export const ORIGENES = ["toca_toca", "enlace_personal", "recomendacion", "evento", "visita", "otro"] as const;
export const MILITANCIAS = ["no_registrada", "declarada", "pendiente", "confirmada"] as const;

/**
 * Día y mes de nacimiento. Sin año se guarda el 2000 (bisiesto: cabe un 29 de febrero) y quien
 * guarda pone `birthYearKnown` en falso, para que nadie lo tome por un año real (D4, 0024).
 */
export function fechaDeNacimiento(dia: number, mes: number, anio?: number): Date | null {
  const fecha = new Date(Date.UTC(anio ?? 2000, mes - 1, dia));
  // Date.UTC no rechaza un 31 de febrero: lo convierte en 2 o 3 de marzo, en silencio.
  return fecha.getUTCDate() === dia && fecha.getUTCMonth() === mes - 1 ? fecha : null;
}

function fechaDeFormulario(texto: string | undefined): Date | null | "invalida" {
  if (!texto) return null;
  const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T12:00:00Z` : texto);
  return Number.isNaN(fecha.getTime()) ? "invalida" : fecha;
}

/** Sección por número o por id, y el municipio que resulta. Mismo criterio que el alta pública. */
export async function resolverSeccionYMunicipio(entrada: {
  sectionNum?: number | undefined;
  sectionId?: string | undefined;
  municipality?: string | undefined;
}): Promise<{ ok: true; sectionId: string | null; municipio: string | null } | { ok: false; campo: string; message: string }> {
  const db = getDatabaseClient();
  const textoMunicipio = entrada.municipality?.trim();
  const municipioElegido = textoMunicipio ? buscarMunicipio(textoMunicipio)?.name ?? null : null;
  if (textoMunicipio && !municipioElegido) {
    return { ok: false, campo: "municipality", message: `«${textoMunicipio}» no es un municipio de Jalisco. Elige uno de la lista.` };
  }

  let seccion: { id: string; num: number; municipio: string | null } | undefined;
  if (entrada.sectionNum !== undefined) {
    const [s] = await db
      .select({ id: schema.electoralSections.id, num: schema.electoralSections.sectionNum, municipio: schema.electoralSections.municipality })
      .from(schema.electoralSections)
      .where(eq(schema.electoralSections.sectionNum, entrada.sectionNum))
      .limit(1);
    // La cartografía de los 125 municipios está completa: un número que no existe es un error de
    // captura, no una sección nueva.
    if (!s) return { ok: false, campo: "sectionNum", message: `La sección ${entrada.sectionNum} no existe en la cartografía electoral de Jalisco. Verifica el número.` };
    seccion = s;
  } else if (entrada.sectionId) {
    if (!esUuid(entrada.sectionId)) return { ok: false, campo: "sectionNum", message: "La sección elegida no existe." };
    const [s] = await db
      .select({ id: schema.electoralSections.id, num: schema.electoralSections.sectionNum, municipio: schema.electoralSections.municipality })
      .from(schema.electoralSections)
      .where(eq(schema.electoralSections.id, entrada.sectionId))
      .limit(1);
    if (!s) return { ok: false, campo: "sectionNum", message: "La sección elegida no existe." };
    seccion = s;
  }

  // La sección decide el municipio (y en la etapa 5, la llave de municipio del ciudadano): una que
  // no corresponde al municipio elegido es un error de captura en uno de los dos.
  if (seccion && municipioElegido && seccion.municipio && seccion.municipio !== municipioElegido) {
    return {
      ok: false,
      campo: "sectionNum",
      message: `La sección ${seccion.num} es de ${seccion.municipio}, no de ${municipioElegido}. Corrige el municipio o la sección.`
    };
  }
  return { ok: true, sectionId: seccion?.id ?? null, municipio: municipioElegido ?? seccion?.municipio ?? null };
}

export async function registrarCiudadano(actor: ActorContext, e: EntradaCiudadano): Promise<ResultadoAlta> {
  const permiso = requirePermission(actor, Permission.ContactsCreate, permissionChecker);
  if (!permiso.ok) return rechazo("forbidden", "Tu rol no puede dar de alta ciudadanos.", undefined, 403);

  const db = getDatabaseClient();
  const buscar = async (clave: string) =>
    (await db
      .select({ id: schema.contacts.id, createdByUserId: schema.contacts.createdByUserId })
      .from(schema.contacts)
      .where(eq(schema.contacts.clientRequestId, clave))
      .limit(1))[0];

  // Un reintento de algo ya guardado se contesta antes de volver a validar.
  if (e.clientRequestId) {
    const previa = await buscar(e.clientRequestId);
    if (previa && previa.createdByUserId !== actor.actorId) return rechazo("solicitud_repetida", "Esta solicitud ya se usó.", undefined, 409);
    if (previa) return { ok: true, contactId: previa.id, repetido: true };
  }

  const alcance = await resolveUserNetworkScope(actor.actorId);
  for (const campo of ["referredByUserId", "actualContactUserId"] as const) {
    const responsable = e[campo];
    if (!responsable) continue;
    if (!esUuid(responsable)) return rechazo("responsable_invalido", "La persona elegida no existe.", campo);
    // El maestro, a cualquiera; un administrador municipal, a su gente (`teammateUserIds` son las personas
    // activas de su municipio); el resto, a su estructura.
    if (!alcance.isMaster && !alcance.teammateUserIds.includes(responsable)) {
      return rechazo("responsable_fuera_de_equipo", "La persona responsable debe pertenecer a tu equipo.", campo, 403);
    }
  }

  const firstName = e.firstName?.trim() ?? "";
  const lastName = e.lastName?.trim() ?? "";
  const maternalLastName = e.maternalLastName?.trim() ?? "";
  // Sin nombre, el caso de uso responde su propio error de dominio (422), como siempre.
  const displayName = [firstName, lastName, maternalLastName].filter(Boolean).join(" ") || (e.displayName?.trim() ?? "");

  let birthDate: Date | null = null;
  if (e.birthDay !== undefined || e.birthMonth !== undefined) {
    if (e.birthDay === undefined || e.birthMonth === undefined) return rechazo("fecha_incompleta", "Indica día y mes de nacimiento.", "birthDay");
    birthDate = fechaDeNacimiento(e.birthDay, e.birthMonth, e.birthYear);
    if (!birthDate) return rechazo("fecha_invalida", "Esa fecha de nacimiento no existe.", "birthDay");
  }

  const territorio = await resolverSeccionYMunicipio(e);
  if (!territorio.ok) return rechazo("territorio_invalido", territorio.message, territorio.campo);
  // Ningún ciudadano sin municipio (C4, D5): quien lo captura sabe dónde vive. Sin nombre, primero va
  // el error de dominio de siempre.
  if (displayName && !territorio.sectionId && !territorio.municipio) {
    return rechazo("municipio_requerido", "Elige el municipio del ciudadano.", "municipality");
  }

  const origen = e.origin ?? "toca_toca";
  if (!(ORIGENES as readonly string[]).includes(origen)) return rechazo("origen_invalido", "Elige el origen del registro de la lista.", "origin");
  const militancia = e.panMilitancy ?? "no_registrada";
  if (!(MILITANCIAS as readonly string[]).includes(militancia)) return rechazo("militancia_invalida", "Elige el estatus de militancia de la lista.", "panMilitancy");

  const primerContacto = fechaDeFormulario(e.firstContactDate);
  if (primerContacto === "invalida") return rechazo("fecha_invalida", "La fecha de primer contacto no es válida.", "firstContactDate");
  const verificada = fechaDeFormulario(e.panMilitancyVerifiedAt);
  if (verificada === "invalida") return rechazo("fecha_invalida", "La fecha de verificación no es válida.", "panMilitancyVerifiedAt");

  const hayUbicacion = e.exactLatitude !== undefined || e.exactLongitude !== undefined;
  if (hayUbicacion && !(e.exactLatitude !== undefined && e.exactLongitude !== undefined && Math.abs(e.exactLatitude) <= 90 && Math.abs(e.exactLongitude) <= 180)) {
    return rechazo("ubicacion_invalida", "La ubicación marcada no es válida. Vuelve a marcarla.", "exactLatitude");
  }

  // La foto de la barda se sube desde el teléfono (C17), y tiene que ser de quien registra: con la
  // URL de una foto ajena, esa foto quedaría a la vista de quien vea esta ficha (A12).
  if (e.bardaPhotoUrl) {
    const ajena = await motivoSiAdjuntosAjenos(actor.actorId, [e.bardaPhotoUrl], [], { soloImagenes: true });
    if (ajena) return rechazo("adjunto_ajeno", ajena, "bardaPhotoUrl");
  }

  const encuesta = e.survey && Object.values(e.survey).some((v) => v !== undefined && v !== null && v !== "") ? e.survey : null;

  // Lo último, cuando todo lo demás ya está bien: el aviso pide una decisión, no una corrección.
  if (!e.confirmarTelefonoRepetido) {
    const aviso = await avisoSiTelefonoRepetido(alcance, e.phone);
    if (aviso) return aviso;
  }

  const deps = await createExtendedContactsMutationsDependencies(db);
  try {
    const r = await crearUnaSolaVez({
      clave: e.clientRequestId,
      indice: "contacts_client_request_idx",
      buscar,
      creadaPor: (fila) => fila.createdByUserId,
      quien: actor.actorId,
      crear: async () => {
        const alta = await registerExtendedContact(
          actor,
          {
            displayName,
            firstName: firstName || null,
            lastName: lastName || null,
            maternalLastName: maternalLastName || null,
            referredByUserId: e.referredByUserId || e.actualContactUserId || null,
            birthDate,
            birthYearKnown: birthDate === null || e.birthYear !== undefined,
            phone: e.phone?.trim() || null,
            email: e.email?.trim() || null,
            address: e.address?.trim() || null,
            addressNumber: e.addressNumber?.trim() || null,
            colony: e.colony?.trim() || "Por identificar",
            municipality: territorio.municipio,
            sectionId: territorio.sectionId,
            profession: e.profession?.trim() || null,
            companyOrWork: e.companyOrWork?.trim() || null,
            yearsKnown: e.yearsKnown ?? null,
            skill: e.skill?.trim() || null,
            availability: e.availability?.trim() || null,
            interests: e.interests?.trim() || null,
            pastSupport: e.pastSupport?.trim() || null,
            origin: origen,
            actualContactUserId: e.actualContactUserId || actor.actorId,
            firstContactDate: primerContacto ?? new Date(),
            preferredContactMethod: e.preferredContactMethod || "whatsapp",
            preferredContactTime: e.preferredContactTime || "indiferente",
            panMilitancy: militancia,
            panMilitancyVerifiedAt: verificada,
            knowMeBetter: e.knowMeBetter?.trim() || null,
            bardaPhotoUrl: e.bardaPhotoUrl || null,
            exactLatitude: e.exactLatitude ?? null,
            exactLongitude: e.exactLongitude ?? null,
            clientRequestId: e.clientRequestId ?? null,
            initialNote: e.initialNote?.trim() || null,
            survey: encuesta
          },
          { ...deps, logger: new DevelopmentLogger(), permissionChecker }
        );
        // Se lanza para que `crearUnaSolaVez` reconozca un choque con la clave; el resto se traduce abajo.
        if (!alta.ok) throw alta.error;
        return { id: alta.value.contactId, createdByUserId: actor.actorId };
      }
    });
    if (!r.ok) return rechazo("solicitud_repetida", "Esta solicitud ya se usó.", undefined, 409);
    if (!r.repetida) {
      await processOutboxInline(db);
      // Su territorio, si la colonia capturada está en el catálogo (D20). Nunca impide el alta.
      await vincularTerritorioDelAlta(actor, r.fila.id, e.colony, territorio.municipio);
    }
    return { ok: true, contactId: r.fila.id, repetido: r.repetida };
  } catch (error) {
    if (!(error instanceof TonalaOsError)) throw error;
    const seguro = toSafeHttpError(error);
    return rechazo(seguro.code, seguro.message, seguro.code === "contact_display_name_required" ? "firstName" : undefined, seguro.status);
  }
}
