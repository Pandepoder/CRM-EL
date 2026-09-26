import { getContactDetail } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies } from "@/lib/crm-deps";
import { actorFromSession, permissionChecker, unauthorized } from "@/lib/api-helpers";
import { exigirAccesoAContacto } from "@/lib/permisos-contacto";
import { veCiudadano } from "@/lib/contact-visibility";
import { registrarConsultaDelMaestro } from "@/lib/auditoria";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { schema } from "@tonala/shared/database";
import { Permission } from "@tonala/shared/auth";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { toSafeHttpError } from "@tonala/shared/errors";
import { registrarError } from "@/lib/registro";
import { esUuid } from "@/lib/ids";
import { darDeBajaCiudadano } from "@/lib/baja-ciudadano";
import { editarCiudadano } from "@/lib/editar-ciudadano";

const NO_ENCONTRADO = () =>
  NextResponse.json({ error: "El contacto no fue encontrado o no tienes permisos para acceder a él." }, { status: 404 });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  if (!esUuid(id)) return NO_ENCONTRADO();
  const denied = await exigirAccesoAContacto(id, actor.actorId, actor.roles);
  if (denied) return denied;
  const db = getDatabaseClient();
  const { contactsReader } = await createCrmDependencies(db);

  // El alcance de equipo lo calcula la capa web y se le pasa al caso de uso.
  // Sin esto, quien no es administración solo podría abrir sus propias fichas,
  // ni siquiera las de su brigada.
  const alcance = await resolveUserNetworkScope(actor.actorId);

  const result = await getContactDetail(actor, {
    contactId: id,
    ...(!alcance.isAdmin && alcance.allowedUserIds ? { scopedUserIds: alcance.allowedUserIds } : {}),
    ...(alcance.isAdmin && !alcance.isMaster ? { scopedAdministration: { municipalityId: alcance.adminMunicipalityId } } : {})
  }, {
    contactsReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  if (!result.ok) {
    // El caso de uso devuelve tal cual cualquier excepción de la base (`err(error as
    // TonalaOsError)`), y aquí se respondía su `message`: la consulta SQL completa con sus
    // parámetros, dentro de un 404. `toSafeHttpError` da el código correcto y solo el texto público.
    const { status, code, message } = toSafeHttpError(result.error);
    if (status >= 500) registrarError("Failed to load contact detail", result.error);
    return NextResponse.json({ error: message, code }, { status });
  }

  const baseDetail = result.value;
  // El maestro ve cualquier ficha; cada una que abre queda en la auditoría (etapa 6).
  await registrarConsultaDelMaestro(actor, alcance, "contact", id);

  // 1. Fetch raw contact row for new August 2026 fields
  const contactRows = await db
    .select({
      id: schema.contacts.id,
      origin: schema.contacts.origin,
      actualContactUserId: schema.contacts.actualContactUserId,
      firstContactDate: schema.contacts.firstContactDate,
      preferredContactMethod: schema.contacts.preferredContactMethod,
      preferredContactTime: schema.contacts.preferredContactTime,
      panMilitancy: schema.contacts.panMilitancy,
      panMilitancyVerifiedAt: schema.contacts.panMilitancyVerifiedAt,
      knowMeBetter: schema.contacts.knowMeBetter,
      bardaPhotoUrl: schema.contacts.bardaPhotoUrl,
      exactLatitude: schema.contacts.exactLatitude,
      exactLongitude: schema.contacts.exactLongitude,
      // Sus datos personales: se capturaban y la ficha no los enseñaba (ni correo, ni nacimiento,
      // ni calle y número). Los ve quien ya ve al ciudadano, igual que su teléfono.
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
      maternalLastName: schema.contacts.maternalLastName,
      email: schema.contacts.email,
      birthDate: schema.contacts.birthDate,
      birthYearKnown: schema.contacts.birthYearKnown,
      version: schema.contacts.version,
      createdByName: schema.userProfiles.displayName,
      createdByRole: schema.userProfiles.accessType,
      municipioNombre: schema.municipalities.name,
      municipioTipo: schema.municipalities.kind
    })
    .from(schema.contacts)
    .leftJoin(schema.userProfiles, eq(schema.contacts.createdByUserId, schema.userProfiles.id))
    .leftJoin(schema.municipalities, eq(schema.contacts.municipalityId, schema.municipalities.id))
    .where(eq(schema.contacts.id, id))
    .limit(1);

  const rawContact = contactRows[0];

  // 2. Fetch notes
  const notes = await db
    .select({
      id: schema.contactNotes.id,
      noteText: schema.contactNotes.noteText,
      createdAt: schema.contactNotes.createdAt,
      authorId: schema.userProfiles.id,
      authorName: schema.userProfiles.displayName,
      authorAccessType: schema.userProfiles.accessType
    })
    .from(schema.contactNotes)
    .leftJoin(schema.userProfiles, eq(schema.contactNotes.authorUserId, schema.userProfiles.id))
    .where(eq(schema.contactNotes.contactId, id))
    .orderBy(desc(schema.contactNotes.createdAt));

  // 3. Fetch survey
  const surveys = await db
    .select()
    .from(schema.socialSurveys)
    .where(eq(schema.socialSurveys.contactId, id))
    .orderBy(desc(schema.socialSurveys.createdAt))
    .limit(1);

  return NextResponse.json({
    ...baseDetail,
    canManageSensitive: alcance.isAdmin,
    // Lo mismo que dejan las rutas de territorio y de asignación. La ficha escondía los dos botones a
    // todo el que no era administración, aunque la brigada tiene permiso de corregir el domicilio —es
    // quien toca la puerta (lib/permissions.ts)— y el líder, de asignar.
    canEditTerritory: actor.permissions.has(Permission.TerritoryLink),
    canAssign: actor.permissions.has(Permission.AssignmentsCreate),
    // Corregir sus datos personales: quien puede registrar (misma regla que PATCH de abajo).
    canEditData: actor.permissions.has(Permission.ContactsCreate),
    firstName: rawContact?.firstName ?? null,
    lastName: rawContact?.lastName ?? null,
    maternalLastName: rawContact?.maternalLastName ?? null,
    email: rawContact?.email ?? null,
    birthDate: rawContact?.birthDate ?? null,
    birthYearKnown: rawContact?.birthYearKnown ?? true,
    version: rawContact?.version ?? 1,
    // La llave de municipio (0022). General quiere decir «sin municipio confirmado» y se enseña así.
    municipio: rawContact?.municipioNombre ? { nombre: rawContact.municipioNombre, esGeneral: rawContact.municipioTipo === "general" } : null,
    origin: rawContact?.origin || "toca_toca",
    actualContactUserId: rawContact?.actualContactUserId,
    firstContactDate: rawContact?.firstContactDate,
    preferredContactMethod: rawContact?.preferredContactMethod || "whatsapp",
    preferredContactTime: rawContact?.preferredContactTime || "indiferente",
    panMilitancy: rawContact?.panMilitancy || "no_registrada",
    panMilitancyVerifiedAt: rawContact?.panMilitancyVerifiedAt,
    knowMeBetter: rawContact?.knowMeBetter,
    bardaPhotoUrl: rawContact?.bardaPhotoUrl,
    exactLatitude: rawContact?.exactLatitude,
    exactLongitude: rawContact?.exactLongitude,
    creator: {
      name: rawContact?.createdByName || "Sistema",
      accessType: rawContact?.createdByRole || "conexion"
    },
    notes,
    survey: surveys[0] || null
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const alcance = await resolveUserNetworkScope(actor.actorId);
  if (!alcance.isAdmin) return NextResponse.json({ error: "Solo administración puede dar de baja ciudadanos" }, { status: 403 });

  const { id } = await params;
  // Un administrador municipal da de baja solo a quien ve (etapa 6); a otro, 404 como inexistente.
  if (!esUuid(id) || !(await veCiudadano(alcance, id))) return NO_ENCONTRADO();
  try {
    // La misma baja que el botón del Directorio: ver `baja-ciudadano.ts`. Un id inexistente es 404
    // y no deja fila en `audit_logs`.
    const existia = await darDeBajaCiudadano(id, actor);
    if (!existia) return NO_ENCONTRADO();
    return NextResponse.json({ success: true });
  } catch (error) {
    registrarError("Failed to delete contact", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** Lo que manda la ficha: "" es «borrar el dato», y los números pueden llegar como texto. */
const textoOpcional = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(max).nullish());
const numeroOpcional = z.preprocess(
  (v) => (v === "" ? null : typeof v === "string" ? Number(v) : v),
  z.number().int().nullish()
);

const esquemaEdicion = z.object({
  version: z.number().int().min(1),
  firstName: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().max(120).optional()),
  lastName: textoOpcional(120),
  maternalLastName: textoOpcional(120),
  phone: textoOpcional(30),
  email: textoOpcional(160),
  birthDay: numeroOpcional,
  birthMonth: numeroOpcional,
  birthYear: numeroOpcional,
  address: textoOpcional(300),
  addressNumber: textoOpcional(40),
  confirmarTelefonoRepetido: z.boolean().optional()
});

/**
 * Corregir los datos personales del ciudadano: ver `lib/editar-ciudadano.ts`. El domicilio electoral
 * (colonia, sección, municipio) sigue en `/territory`.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const { id } = await params;

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ code: "json_invalido", message: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  const a = esquemaEdicion.safeParse(cuerpo);
  if (!a.success) {
    const problema = a.error.issues[0];
    return NextResponse.json(
      { code: "datos_invalidos", message: problema?.message ?? "Datos no válidos.", campo: problema?.path[0]?.toString() },
      { status: 400 }
    );
  }
  try {
    const r = await editarCiudadano(actor, id, a.data);
    if (!r.ok) {
      return NextResponse.json(
        { code: r.code, message: r.message, campo: r.campo, contactoExistenteId: r.contactoExistenteId },
        { status: r.status }
      );
    }
    return NextResponse.json({ version: r.version, cambios: r.cambios });
  } catch (error) {
    registrarError("Failed to update contact data", error);
    return NextResponse.json({ code: "internal_error", message: "No se pudieron guardar los cambios. Intenta de nuevo." }, { status: 500 });
  }
}
