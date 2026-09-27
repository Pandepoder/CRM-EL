import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, esValorCifrado, huellaDeTelefono, normalizarTelefono } from "@tonala/shared/database";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";
import { registrarError } from "@/lib/registro";
import { actorFromSession } from "@/lib/api-helpers";
import { fechaDeNacimiento, resolverSeccionYMunicipio } from "@/lib/alta-ciudadano";
import { crearUnaSolaVez, type ResultadoUnaSolaVez } from "@/lib/idempotencia";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getSessionOptions } from "@/lib/session";
import { getServerSession } from "@/lib/session-server";
import { vincularTerritorioDelAlta } from "@/lib/territorio-del-alta";

// Un formulario web manda "" para lo que se deja en blanco, y z.coerce.number()
// convierte "" en 0: el año, la sección o la calificación vacíos tumbaban el alta entera.
const numeroOpcional = <T extends z.ZodTypeAny>(esquema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), esquema);

const surveySchema = z.object({
  colonyPriorityNeed: z.string().trim().max(200).optional(),
  colonyPriorityOther: z.string().trim().max(300).optional(),
  tonalaValues: z.string().trim().max(200).optional(),
  tonalaValuesOther: z.string().trim().max(300).optional(),
  servicesRating: numeroOpcional(z.coerce.number().int().min(1).max(5).optional()),
  servicesRatingWhy: z.string().trim().max(500).optional(),
  projectExpectations: z.string().trim().max(500).optional(),
  projectExpectationsOther: z.string().trim().max(300).optional(),
  participationForm: z.string().trim().max(200).optional(),
  participationFormOther: z.string().trim().max(300).optional(),
  openProposal: z.string().trim().max(1000).optional()
});

const publicRegistrationSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional(),
  maternalLastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().max(160).email().optional().or(z.literal("")),
  birthDay: z.coerce.number().int().min(1).max(31),
  birthMonth: z.coerce.number().int().min(1).max(12),
  birthYear: numeroOpcional(z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional()),
  address: z.string().trim().max(300).optional(),
  colony: z.string().trim().max(150).optional(),
  // Del catálogo de Jalisco o nada: el texto libre de antes guardaba "Tonala Jal.", "zapopan" o
  // cualquier cosa (D1). Se valida abajo, con el mismo criterio que el alta interna.
  municipality: z.string().trim().max(100).optional(),
  sectionNum: numeroOpcional(z.coerce.number().int().positive().optional()),
  profession: z.string().trim().max(150).optional(),
  preferredContactMethod: z.string().trim().max(40).default("whatsapp"),
  preferredContactTime: z.string().trim().max(40).default("indiferente"),
  participatingArea: z.string().trim().max(200).optional(),
  knowMeBetter: z.string().trim().max(500).optional(),
  survey: surveySchema.nullish(),
  // Clave del formulario (R16): el reenvío de un registro que sí llegó no lo rechaza como
  // «teléfono ya registrado» ni lo duplica; devuelve el mismo.
  clientRequestId: numeroOpcional(z.string().uuid().optional()),
  // Modo evento (kiosco): el origen del ciudadano queda como «evento».
  modo: numeroOpcional(z.enum(["evento"]).optional())
});

/**
 * Límites por hora. Eran 60 por IP y enlace, pensados para contener un escaneo que leía y
 * descifraba el padrón entero en cada alta (C2). Ese costo ya no existe —el duplicado se busca por
 * la huella del teléfono, con índice—, y con 60 un evento real se quedaba sin registro: en la WiFi
 * de un salón, o detrás de la misma IP de la compañía telefónica, la persona 61 de la hora recibía
 * «demasiados intentos» (R25). Quien opera el modo evento con su sesión abierta tiene su propio
 * límite, por persona y no por IP.
 */
/** Otra solicitud guardó este teléfono mientras esta esperaba su turno (ver el paso 6). */
class TelefonoYaRegistrado extends Error {}

const LIMITE_POR_IP_Y_ENLACE = 300;
const LIMITE_DEL_OPERADOR = 1000;
const HORA = 60 * 60 * 1000;

/** ¿Quien envía es la persona dueña del enlace, o alguien que la tiene bajo su mando? */
async function operadorDelEnlace(req: NextRequest, duenoId: string): Promise<string | null> {
  // Sin cookie de sesión —el caso de casi todo el que escanea un QR— no se consulta nada más.
  if (!req.cookies.has(getSessionOptions().cookieName)) return null;
  const sesion = await getServerSession();
  if (!sesion.isLoggedIn || !sesion.userId) return null;
  const actor = await actorFromSession();
  if (!actor) return null;
  if (actor.actorId === duenoId) return actor.actorId;
  const alcance = await resolveUserNetworkScope(actor.actorId);
  // El maestro opera cualquier enlace; un administrador municipal, los de su gente; el resto, los de su
  // estructura (etapa 6).
  return alcance.isMaster || (alcance.allowedUserIds ?? []).includes(duenoId) ? actor.actorId : null;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    let rawBody: { slug?: unknown } | null;
    try {
      rawBody = await req.json();
    } catch {
      // Un cuerpo que no es JSON es un error de quien envía, no del servidor (antes, 500).
      return NextResponse.json({ error: "Datos de registro inválidos." }, { status: 400 });
    }
    const slugLimite = typeof rawBody?.slug === "string" ? rawBody.slug.toLowerCase().slice(0, 80) : "";

    const parsed = publicRegistrationSchema.safeParse(rawBody);
    if (!parsed.success) {
      const rl = checkRateLimit(`public-reg:${ip}:${slugLimite}`, LIMITE_POR_IP_Y_ENLACE, HORA);
      if (!rl.allowed) return rateLimitResponse(rl);
      const problema = parsed.error.issues[0];
      return NextResponse.json(
        { error: "Datos de registro inválidos.", campo: problema?.path[0]?.toString(), details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      slug,
      firstName,
      lastName,
      maternalLastName,
      phone,
      email,
      birthDay,
      birthMonth,
      birthYear,
      address,
      colony,
      municipality,
      sectionNum,
      profession,
      preferredContactMethod,
      preferredContactTime,
      participatingArea,
      knowMeBetter,
      survey,
      clientRequestId,
      modo
    } = parsed.data;

    const db = getDatabaseClient();

    // 1. Resolve host user by slug
    const hostUser = await db
      .select({
        id: schema.userProfiles.id,
        displayName: schema.userProfiles.displayName
      })
      .from(schema.userProfiles)
      .where(
        and(
          eq(schema.userProfiles.personalSlug, slug.toLowerCase()),
          eq(schema.userProfiles.status, "active")
        )
      )
      .limit(1);

    if (!hostUser[0]) {
      const rl = checkRateLimit(`public-reg:${ip}:${slugLimite}`, LIMITE_POR_IP_Y_ENLACE, HORA);
      if (!rl.allowed) return rateLimitResponse(rl);
      return NextResponse.json({ error: "El enlace personal no es válido o ha expirado." }, { status: 404 });
    }

    const owner = hostUser[0];
    const operador = await operadorDelEnlace(req, owner.id);
    const rl = operador
      ? checkRateLimit(`public-reg:operador:${operador}`, LIMITE_DEL_OPERADOR, HORA)
      : checkRateLimit(`public-reg:${ip}:${slugLimite}`, LIMITE_POR_IP_Y_ENLACE, HORA);
    if (!rl.allowed) return rateLimitResponse(rl);

    const buscarPorClave = async (clave: string) =>
      (await db
        .select({ id: schema.contacts.id, createdByUserId: schema.contacts.createdByUserId })
        .from(schema.contacts)
        .where(eq(schema.contacts.clientRequestId, clave))
        .limit(1))[0];

    // «Este teléfono ya está registrado»… salvo que sea esta misma solicitud, guardada por otro toque
    // mientras esta pasaba entre la búsqueda por clave y la del teléfono: para quien envía es su propio
    // registro. Visto en el simulacro de evento, con dobles toques a la vez.
    const telefonoYaRegistrado = async () => {
      const previa = clientRequestId ? await buscarPorClave(clientRequestId) : undefined;
      if (previa && previa.createdByUserId === owner.id) {
        return NextResponse.json({ success: true, contactId: previa.id, repetido: true, message: "¡Registro completado exitosamente! Gracias por sumarte." });
      }
      return NextResponse.json({ error: "Este teléfono ya se encuentra registrado en el padrón.", campo: "phone" }, { status: 409 });
    };

    // 2. ¿Es el reenvío de un registro que ya llegó? Va antes de buscar el teléfono: si no, el
    // reintento de quien sí quedó registrado recibiría «este teléfono ya está registrado».
    if (clientRequestId) {
      const previa = await buscarPorClave(clientRequestId);
      if (previa && previa.createdByUserId !== owner.id) {
        return NextResponse.json({ error: "Esta solicitud ya se usó." }, { status: 409 });
      }
      if (previa) {
        return NextResponse.json({ success: true, contactId: previa.id, repetido: true, message: "¡Registro completado exitosamente! Gracias por sumarte." });
      }
    }

    // 3. Detección de duplicados por teléfono
    //
    // Antes se leía y descifraba la tabla ENTERA de contactos en cada alta: 22 µs por fila,
    // lineal con la concurrencia. Con 3 385 ciudadanos, 50 personas registrándose a la vez
    // esperaban 2,5 s cada una; con 50 000, más de un segundo por persona solo en el escaneo, en
    // un endpoint público y sin sesión. Ahora se busca por la huella del teléfono, con índice.
    //
    // La regla de qué es "el mismo teléfono" no cambia: se comparan todos los dígitos.
    const telefonoNormalizado = normalizarTelefono(phone);
    if (!telefonoNormalizado) {
      // Sin ningún dígito no hay teléfono. Antes eso daba "" y coincidía con cualquier teléfono
      // guardado sin dígitos, así que se rechazaba a la persona como si ya estuviera registrada.
      return NextResponse.json({ error: "Revisa el teléfono: no tiene ningún número.", campo: "phone" }, { status: 400 });
    }

    const [porHuella] = await db
      .select({ id: schema.contacts.id })
      .from(schema.contacts)
      .where(eq(schema.contacts.phoneHash, huellaDeTelefono(telefonoNormalizado)!))
      .limit(1);

    // Las filas que todavía no tienen huella —el relleno de `pnpm db:migrate` sin terminar, o un
    // teléfono que no se pudo descifrar— se revisan aparte, como antes. Terminado el relleno esta
    // consulta no devuelve nada, y el índice parcial la hace instantánea.
    let duplicate = porHuella;
    if (!duplicate) {
      const sinHuella = await db
        .select({ id: schema.contacts.id, phone: schema.contacts.phone })
        .from(schema.contacts)
        .where(and(isNull(schema.contacts.phoneHash), isNotNull(schema.contacts.phone)));
      duplicate = sinHuella.find(
        (c) => !esValorCifrado(c.phone) && normalizarTelefono(c.phone) === telefonoNormalizado
      );
    }

    // Do not disclose who the phone number belongs to — this endpoint is public and unauthenticated.
    if (duplicate) return telefonoYaRegistrado();

    // 4. Sección y municipio: del catálogo, y coherentes entre sí. Una sección que no existe o que
    // es de otro municipio se rechaza diciendo cuál, en vez de guardarse a medias.
    const territorio = await resolverSeccionYMunicipio({ sectionNum, municipality });
    if (!territorio.ok) return NextResponse.json({ error: territorio.message, campo: territorio.campo }, { status: 400 });
    // Ningún ciudadano sin municipio (D1): cualquiera sabe en qué municipio vive.
    if (!territorio.municipio) return NextResponse.json({ error: "Elige el municipio donde vives.", campo: "municipality" }, { status: 400 });
    // La colonia se pide (decisión del dueño, 2026-09-26): sin ella el ciudadano no se puede ubicar ni
    // repartir. La calle y el número siguen siendo opcionales aquí, para no frenar un evento.
    if (!colony?.trim()) return NextResponse.json({ error: "Escribe tu colonia o fraccionamiento.", campo: "colony" }, { status: 400 });

    // 5. Fecha de nacimiento: un 31 de febrero ya no se convierte en silencio en 3 de marzo.
    const birthDate = fechaDeNacimiento(birthDay, birthMonth, birthYear);
    if (!birthDate) return NextResponse.json({ error: "Esa fecha de cumpleaños no existe. Revisa el día y el mes.", campo: "birthDay" }, { status: 400 });

    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ""} ${maternalLastName ? maternalLastName.trim() : ""}`.trim();

    // 6. Ciudadano, nota y encuesta en una sola transacción: antes eran tres escrituras sueltas, y
    // un fallo a medias dejaba un ciudadano sin su nota que el reintento, además, daba por bueno.
    const huella = huellaDeTelefono(telefonoNormalizado)!;
    let resultado: ResultadoUnaSolaVez<{ id: string; createdByUserId: string }>;
    try {
      resultado = await crearUnaSolaVez({
        clave: clientRequestId,
        indice: "contacts_client_request_idx",
        buscar: buscarPorClave,
        creadaPor: (fila) => fila.createdByUserId,
        quien: owner.id,
        crear: () =>
          db.transaction(async (tx) => {
            // El mismo teléfono dos veces a la vez —la persona desde su teléfono y desde el kiosco, o
            // dos intentos con solicitudes distintas— pasaba dos veces la búsqueda de arriba y dejaba
            // dos fichas (en el simulacro de evento, cuatro de cuatro). El candado por huella los pone
            // en fila: el segundo vuelve a buscar cuando el primero ya está guardado.
            await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`registro-publico:${huella}`}))`);
            const [yaRegistrado] = await tx
              .select({ id: schema.contacts.id })
              .from(schema.contacts)
              .where(eq(schema.contacts.phoneHash, huella))
              .limit(1);
            if (yaRegistrado) throw new TelefonoYaRegistrado();

            const contactId = crypto.randomUUID();
            const ahora = new Date();
            await tx.insert(schema.contacts).values({
              id: contactId,
              displayName: fullName,
              status: "active",
              createdByUserId: owner.id,
              referredByUserId: owner.id,
              actualContactUserId: owner.id,
              sectionId: territorio.sectionId,
              firstName: firstName.trim(),
              lastName: lastName ? lastName.trim() : null,
              maternalLastName: maternalLastName ? maternalLastName.trim() : null,
              birthDate,
              // Sin año, la fecha lleva el 2000 y no es un dato (D4).
              birthYearKnown: birthYear !== undefined,
              phone: phone.trim(),
              phoneHash: huellaDeTelefono(phone),
              email: email ? email.trim() : null,
              address: address ? address.trim() : null,
              colony: colony ? colony.trim() : "Por identificar",
              // El nombre oficial del catálogo, o el de la sección. Nunca texto libre (D1).
              municipality: territorio.municipio,
              // Y su llave. Con sección, la base pone la de la sección, que es la misma (ya se comprobó).
              municipalityId: sql`(SELECT id FROM municipalities WHERE name = ${territorio.municipio} AND kind = 'municipio')`,
              profession: profession ? profession.trim() : null,
              interests: participatingArea ? participatingArea.trim() : null,
              origin: modo === "evento" ? "evento" : "enlace_personal",
              firstContactDate: ahora,
              preferredContactMethod,
              preferredContactTime,
              panMilitancy: "no_registrada",
              knowMeBetter: knowMeBetter ? knowMeBetter.trim() : null,
              clientRequestId: clientRequestId ?? null,
              createdAt: ahora,
              version: 1
            });

            await tx.insert(schema.contactNotes).values({
              contactId,
              authorUserId: owner.id,
              noteText: `Registro completado vía ${modo === "evento" ? "modo evento del enlace" : "Enlace Personal"} de ${owner.displayName}. Área de interés: ${participatingArea || "General"}.`,
              createdAt: ahora
            });

            if (survey) {
              await tx.insert(schema.socialSurveys).values({
                contactId,
                colonyPriorityNeed: survey.colonyPriorityNeed || null,
                colonyPriorityOther: survey.colonyPriorityOther || null,
                tonalaValues: survey.tonalaValues || null,
                tonalaValuesOther: survey.tonalaValuesOther || null,
                servicesRating: survey.servicesRating ?? null,
                servicesRatingWhy: survey.servicesRatingWhy || null,
                projectExpectations: survey.projectExpectations || null,
                projectExpectationsOther: survey.projectExpectationsOther || null,
                participationForm: survey.participationForm || null,
                participationFormOther: survey.participationFormOther || null,
                openProposal: survey.openProposal || null,
                createdAt: ahora
              });
            }
            return { id: contactId, createdByUserId: owner.id };
          })
      });
    } catch (error) {
      if (!(error instanceof TelefonoYaRegistrado)) throw error;
      // Un doble toque de la MISMA solicitud también llega aquí: el primero guardó y el segundo
      // encontró el teléfono dentro del candado.
      return telefonoYaRegistrado();
    }

    if (!resultado.ok) return NextResponse.json({ error: "Esta solicitud ya se usó." }, { status: 409 });
    // Su territorio, si la colonia que escribió está en el catálogo de su municipio (D20); a nombre del
    // dueño del enlace, como el ciudadano mismo. Nunca impide el registro.
    if (!resultado.repetida) await vincularTerritorioDelAlta(owner.id, resultado.fila.id, colony, territorio.municipio);

    return NextResponse.json({
      success: true,
      contactId: resultado.fila.id,
      repetido: resultado.repetida,
      message: "¡Registro completado exitosamente! Gracias por sumarte."
    });
  } catch (error: unknown) {
    registrarError("Error in public registration", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al procesar el registro.") }, { status: 500 });
  }
}
