import { contactosVisibles } from "@/lib/contact-visibility";
import { listContacts } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { getDatabaseClient } from "@/lib/db-client";
import { createCrmDependencies } from "@/lib/crm-deps";
import { actorFromSession, permissionChecker, resultToResponse, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/** Número entero positivo de la URL, dentro de un tope; si no, el valor por omisión. */
function enteroDeLaUrl(valor: string | null, porOmision: number, tope: number): number {
  const n = Number.parseInt(valor ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, tope) : porOmision;
}

export async function GET(request: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  // `q`, `page` y `pageSize` se ignoraban: el caso de uso los acepta, pero la ruta no se los pasaba
  // y cualquier búsqueda devolvía la primera página del padrón.
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 120) || undefined;
  const page = enteroDeLaUrl(url.searchParams.get("page"), 1, 10_000);
  const pageSize = enteroDeLaUrl(url.searchParams.get("pageSize"), 25, 100);

  const db = getDatabaseClient();
  const { contactsReader } = await createCrmDependencies(db);
  const alcance = await resolveUserNetworkScope(actor.actorId);
  // Quien no es administración, con su cascada (la lista de ids ya filtrada por territorio); un
  // administrador municipal, con su municipio; el maestro, sin recorte (etapa 6).
  const visibles = alcance.isAdmin ? null : await contactosVisibles(alcance);
  const result = await listContacts(actor, {
    ...(visibles && "ids" in visibles ? { scopedContactIds: visibles.ids } : {}),
    ...(!alcance.isAdmin && alcance.allowedUserIds ? { scopedUserIds: alcance.allowedUserIds } : {}),
    ...(alcance.isAdmin && !alcance.isMaster ? { scopedAdministration: { municipalityId: alcance.adminMunicipalityId } } : {}),
    ...(q ? { q } : {}),
    page,
    pageSize
  }, {
    contactsReader,
    logger: new DevelopmentLogger(),
    permissionChecker
  });

  return resultToResponse(result);
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { registrarCiudadano } from "@/lib/alta-ciudadano";
import { registrarError } from "@/lib/registro";

/** Lo que manda un formulario: "" es "sin dato", y los números llegan como texto. */
const vacio = (v: unknown) => (v === "" || v === null ? undefined : v);
const texto = (max: number) => z.preprocess((v) => vacio(typeof v === "string" ? v.trim() : v), z.string().max(max).optional());
const numero = (esquema: z.ZodNumber) => z.preprocess((v) => { const x = vacio(v); return typeof x === "string" ? Number(x) : x; }, esquema.optional());

const esquemaEncuesta = z.object({
  colonyPriorityNeed: texto(200), colonyPriorityOther: texto(300), tonalaValues: texto(200), tonalaValuesOther: texto(300),
  servicesRating: numero(z.number().int().min(1).max(5)), servicesRatingWhy: texto(500),
  projectExpectations: texto(500), projectExpectationsOther: texto(300),
  participationForm: texto(200), participationFormOther: texto(300), openProposal: texto(1000)
});

const esquemaAlta = z.object({
  firstName: texto(120), lastName: texto(120), maternalLastName: texto(120),
  displayName: texto(300), fullName: texto(300),
  phone: texto(30), phoneNumber: texto(30), email: z.preprocess((v) => vacio(typeof v === "string" ? v.trim() : v), z.string().max(160).email("El correo no es válido.").optional()),
  birthDay: numero(z.number().int().min(1).max(31)), birthMonth: numero(z.number().int().min(1).max(12)),
  birthYear: numero(z.number().int().min(1900).max(new Date().getFullYear())),
  address: texto(300), addressNumber: texto(40), colony: texto(150), municipality: texto(100),
  sectionNum: numero(z.number().int().positive()), sectionId: texto(40),
  profession: texto(150), companyOrWork: texto(150), yearsKnown: numero(z.number().int().min(0).max(120)),
  skill: texto(200), availability: texto(200), interests: texto(300), participatingArea: texto(200), pastSupport: texto(300),
  referredByUserId: texto(40), actualContactUserId: texto(40),
  origin: texto(40), firstContactDate: texto(40), preferredContactMethod: texto(40), preferredContactTime: texto(40),
  panMilitancy: texto(40), panMilitancyVerifiedAt: texto(40), knowMeBetter: texto(1000), bardaPhotoUrl: texto(300),
  exactLatitude: numero(z.number().finite()), exactLongitude: numero(z.number().finite()),
  initialNote: texto(4000), survey: esquemaEncuesta.nullish(),
  clientRequestId: z.preprocess(vacio, z.string().uuid("La clave de la solicitud no es válida.").optional()),
  confirmarTelefonoRepetido: z.boolean().optional()
});

/**
 * Alta de ciudadano. Es la que usa `/crm/nuevo` (antes una acción de servidor que perdía el
 * formulario ante cualquier error) y la que usa la cola de reintento del teléfono: ver
 * `lib/alta-ciudadano.ts`. Sigue aceptando el cuerpo corto de antes (`displayName` o `fullName` y
 * `phoneNumber`).
 */
export async function POST(request: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ code: "json_invalido", message: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  const a = esquemaAlta.safeParse(cuerpo);
  if (!a.success) {
    const problema = a.error.issues[0];
    return NextResponse.json(
      { code: "datos_invalidos", message: problema?.message ?? "Datos no válidos.", campo: problema?.path[0]?.toString() },
      { status: 400 }
    );
  }

  // Calle y número, obligatorios en el alta del panel (decisión del dueño, 2026-09-26): quien captura
  // está frente a la persona o marca su casa en el mapa. En el registro público por QR siguen siendo
  // opcionales, para no frenar un evento. Va después del nombre, que es el error que se dice primero.
  const tieneNombre = Boolean(a.data.firstName || a.data.lastName || a.data.displayName || a.data.fullName);
  if (tieneNombre && !a.data.address) {
    return NextResponse.json(
      { code: "domicilio_requerido", message: "Escribe la calle y el número del ciudadano (o márcalo en el mapa).", campo: "address" },
      { status: 400 }
    );
  }

  const { fullName, phoneNumber, participatingArea, interests, displayName, phone, ...resto } = a.data;
  try {
    const r = await registrarCiudadano(actor, {
      ...resto,
      displayName: displayName ?? fullName,
      phone: phone ?? phoneNumber,
      interests: interests ?? participatingArea,
      survey: a.data.survey ?? undefined
    });
    if (!r.ok) return NextResponse.json({ code: r.code, message: r.message, campo: r.campo, contactoExistenteId: r.contactoExistenteId }, { status: r.status });
    return NextResponse.json({ contactId: r.contactId, repetido: r.repetido }, { status: r.repetido ? 200 : 201 });
  } catch (error) {
    registrarError("Error in POST /api/crm/contacts", error);
    return NextResponse.json({ code: "internal_error", message: "No se pudo registrar al ciudadano. Intenta de nuevo." }, { status: 500 });
  }
}
