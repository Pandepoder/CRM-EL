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
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().max(160).email(),
  password: z.string().min(6).max(200)
});

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = checkRateLimit(`unirme:${ip}`, 8, 60 * 60 * 1000);
    if (!rl.allowed) return rateLimitResponse(rl);

    const parsed = esquema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Revisa los datos: falta algo o el correo no es válido." },
        { status: 400 }
      );
    }
    const { slug, displayName, phone, email, password } = parsed.data;
    const correo = email.toLowerCase();

    const db = getDatabaseClient();

    // 1. Quién invita
    const anfitriones = await db
      .select({ id: schema.userProfiles.id, displayName: schema.userProfiles.displayName })
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
      console.error("Catálogo de roles sin 'visit_responsible': alta de brigada rechazada.");
      return NextResponse.json({ error: "Error interno de configuración." }, { status: 500 });
    }

    // 4. La brigada del anfitrión: primero la que lidera, si no, en la que está.
    const lideradas = await db
      .select({ id: schema.teams.id, name: schema.teams.name })
      .from(schema.teams)
      .where(eq(schema.teams.leaderId, anfitrion.id))
      .limit(1);

    let equipo = lideradas[0] ?? null;
    if (!equipo) {
      const pertenece = await db
        .select({ id: schema.teams.id, name: schema.teams.name })
        .from(schema.teamMembers)
        .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
        .where(eq(schema.teamMembers.userId, anfitrion.id))
        .limit(1);
      equipo = pertenece[0] ?? null;
    }

    const userId = randomUUID();
    await db.insert(schema.userProfiles).values({
      id: userId,
      email: correo,
      displayName,
      phone,
      passwordHash: await hashPassword(password),
      roleId: rolBrigadista.id,
      personalSlug: await generateUniquePersonalSlug(displayName),
      // Lo que faltaba: de quién viene y bajo qué enlace queda.
      invitedByUserId: anfitrion.id,
      parentEnlaceId: anfitrion.id,
      status: "pending",
      version: 1
    });

    // 5. Se apunta a la brigada desde ya. La cuenta sigue en `pending`, así que
    //    no puede entrar: cuando la acepten, ya está en su equipo y nadie tiene
    //    que acordarse de añadirla.
    if (equipo) {
      await db
        .insert(schema.teamMembers)
        .values({ teamId: equipo.id, userId })
        .onConflictDoNothing();
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
    console.error("Alta desde QR de brigada:", error);
    return NextResponse.json(
      { error: safeErrorMessage(error, "No se pudo enviar tu solicitud.") },
      { status: 500 }
    );
  }
}
