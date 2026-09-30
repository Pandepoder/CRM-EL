import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { hashPassword } from "@/lib/auth";
import { generateUniquePersonalSlug } from "@/lib/personal-slug";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";
import { municipioDelUsuario } from "@/lib/municipio-usuario";
import { esViolacionUnica } from "@/lib/idempotencia";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { registrar, registrarError } from "@/lib/registro";
import { validarDomicilioDePersona } from "@/lib/domicilio-persona";
import { validarTelefonoOpcional } from "@/lib/telefono-persona";

/**
 * Alta de brigadista desde el QR de una brigada.
 *
 * Hasta ahora quien quería trabajar se registraba en `/register` y su solicitud
 * llegaba anónima: `invited_by_user_id` quedaba en nulo y nadie sabía quién lo
 * había traído ni a qué brigada asignarlo. El administrador tenía que
 * preguntarlo por WhatsApp. Las columnas para guardarlo existían desde el
 * principio; simplemente nadie las llenaba.
 *
 * Ahora cada persona tiene un segundo enlace —`/unirme/su-nombre`— y quien lo
 * escanea queda registrado con su invitador y ya dentro de su brigada.
 *
 * La cuenta nace en `pending`, así que **no puede entrar** hasta que el líder o
 * un administrador la acepte. Es deliberado: un enlace acaba reenviado en
 * cualquier grupo de WhatsApp, y sin ese paso cualquiera con el enlace estaría
 * dentro de la estructura.
 */
const esquema = z.object({
  slug: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(3).max(120),
  // Opcional (decisión del dueño, 2026-09-30); si se escribe, se valida abajo.
  phone: z.string().optional(),
  email: z.string().trim().max(160).email(),
  password: z.string().min(6).max(200),
  // Su domicilio (0025, decisión del dueño 2026-09-26): se valida abajo con el mismo criterio que el
  // auto-registro y «Mi perfil».
  homeAddress: z.string().optional(),
  homeColony: z.string().optional(),
  homeMunicipality: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const cuerpo = await request.json();
    const slugLimite = typeof cuerpo?.slug === "string" ? cuerpo.slug.toLowerCase().slice(0, 80) : "";
    // Por IP y enlace: una reunión de brigada comparte la misma red.
    const rl = checkRateLimit(`unirme:${ip}:${slugLimite}`, 30, 60 * 60 * 1000);
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = esquema.safeParse(cuerpo);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Revisa los datos: falta algo o el correo no es válido." },
        { status: 400 }
      );
    }
    const { slug, displayName, email, password } = parsed.data;
    const correo = email.toLowerCase();
    const telefono = validarTelefonoOpcional(parsed.data.phone);
    if (!telefono.ok) return NextResponse.json({ error: telefono.error, campo: "phone" }, { status: 400 });
    const domicilio = validarDomicilioDePersona(parsed.data);
    if (!domicilio.ok) return NextResponse.json({ error: domicilio.error, campo: domicilio.campo }, { status: 400 });

    const db = getDatabaseClient();

    // 1. Quién invita
    const anfitriones = await db
      .select({
        id: schema.userProfiles.id,
        displayName: schema.userProfiles.displayName,
        municipality: schema.userProfiles.municipality
      })
      .from(schema.userProfiles)
      .where(
        and(
          eq(schema.userProfiles.personalSlug, slug.toLowerCase()),
          eq(schema.userProfiles.status, "active")
        )
      )
      .limit(1);

    const anfitrion = anfitriones[0];
    if (!anfitrion) {
      return NextResponse.json({ error: "Este enlace de invitación ya no es válido." }, { status: 404 });
    }

    // 2. ¿Ya existe esa persona?
    const existentes = await db
      .select({ id: schema.userProfiles.id, status: schema.userProfiles.status })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.email, correo))
      .limit(1);

    if (existentes[0]) {
      return NextResponse.json(
        {
          error:
            existentes[0].status === "pending"
              ? "Ya tienes una solicitud en revisión con ese correo."
              : "Ese correo ya tiene una cuenta. Inicia sesión."
        },
        { status: 400 }
      );
    }

    // 3. Rol de brigadista. Si faltara del catálogo se rechaza el alta: echar
    //    mano de "un rol cualquiera" convertiría un fallo de configuración en
    //    una escalada de privilegios abierta al formulario público.
    const roles = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.key, "visit_responsible"))
      .limit(1);

    const rolBrigadista = roles[0];
    if (!rolBrigadista) {
      registrar("error", "Catálogo de roles sin 'visit_responsible': alta de brigada rechazada.");
      return NextResponse.json({ error: "Error interno de configuración." }, { status: 500 });
    }

    // 4. La brigada del anfitrión: primero la que lidera, si no, en la que está.
    const lideradas = await db
      .select({ id: schema.teams.id, name: schema.teams.name, municipality: schema.teams.municipality })
      .from(schema.teams)
      .where(eq(schema.teams.leaderId, anfitrion.id))
      .limit(1);

    let equipo = lideradas[0] ?? null;
    if (!equipo) {
      const pertenece = await db
        .select({ id: schema.teams.id, name: schema.teams.name, municipality: schema.teams.municipality })
        .from(schema.teamMembers)
        .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
        .where(eq(schema.teamMembers.userId, anfitrion.id))
        .limit(1);
      equipo = pertenece[0] ?? null;
    }

    // El territorio se hereda de quien invita, o de la brigada a la que entra. Sin esto,
    // quien se suma por el QR de un líder de Zapopan quedaba sin municipio y al entrar veía
    // la aplicación sin territorio y el mapa abierto en todo Jalisco.
    // Se usa la misma resolución con la que el anfitrión ve la aplicación, validada contra el
    // catálogo: así quien entra por su enlace queda en el municipio que el anfitrión ve, y no en
    // el de la primera brigada que aparezca en la consulta.
    const municipio = (await municipioDelUsuario(anfitrion.id)) ?? buscarMunicipio(equipo?.municipality)?.name ?? null;

    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    const personalSlug = await generateUniquePersonalSlug(displayName);
    try {
      // La cuenta y su lugar en la brigada, juntos: eran dos escrituras sueltas, y un fallo entre las
      // dos dejaba una solicitud que ningún líder veía en su equipo.
      await db.transaction(async (tx) => {
        await tx.insert(schema.userProfiles).values({
          id: userId,
          email: correo,
          displayName,
          phone: telefono.telefono,
          passwordHash,
          roleId: rolBrigadista.id,
          personalSlug,
          // Lo que faltaba: de quién viene y bajo qué enlace queda.
          invitedByUserId: anfitrion.id,
          parentEnlaceId: anfitrion.id,
          ...(municipio ? { municipality: municipio } : {}),
          ...domicilio.domicilio,
          status: "pending",
          version: 1
        });

        // 5. Se apunta a la brigada desde ya. La cuenta sigue en `pending`, así que
        //    no puede entrar: cuando la acepten, ya está en su equipo y nadie tiene
        //    que acordarse de añadirla.
        if (equipo) {
          await tx
            .insert(schema.teamMembers)
            .values({ teamId: equipo.id, userId })
            .onConflictDoNothing();
        }
      });
    } catch (error) {
      // Dos o tres toques a la vez con el mismo correo pasan juntos la comprobación del paso 2; el índice
      // deja pasar a uno y los demás respondían 500 (visto en el simulacro de evento). Para quien toca
      // es su propia solicitud, que ya está en revisión.
      if (esViolacionUnica(error, "user_profiles_email_unique") || esViolacionUnica(error, "user_profiles_email_lower_unique")) {
        return NextResponse.json({ error: "Ya tienes una solicitud en revisión con ese correo." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({
      ok: true,
      pendiente: true,
      anfitrion: anfitrion.displayName,
      equipo: equipo?.name ?? null,
      mensaje: equipo
        ? `Solicitud enviada. ${anfitrion.displayName} tiene que aceptarte para que entres a ${equipo.name}.`
        : `Solicitud enviada. ${anfitrion.displayName} tiene que aceptarte para que puedas entrar.`
    });
  } catch (error: unknown) {
    registrarError("Alta desde QR de brigada", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "No se pudo enviar tu solicitud.") },
      { status: 500 }
    );
  }
}
