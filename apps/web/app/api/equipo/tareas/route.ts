import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  try {
    const body = await req.json();
    const {
      title,
      description = "",
      assignedToUserId,
      scheduledAt,
      category = "brigada",
      roleAssignment,
      sectionId,
      contactId,
      locationText = "",
      latitude = 20.6248,
      longitude = -103.2422,
      municipality = "Tonalá"
    } = body;

    const assignedUser = assignedToUserId || (actor.actorId as string);

    if (!title || !scheduledAt) {
      return NextResponse.json(
        { error: "El título de la actividad y la fecha son obligatorios." },
        { status: 400 }
      );
    }

    const db = getDatabaseClient();
    const scheduledDate = new Date(scheduledAt);

    // 1. If roleAssignment is provided and actor has permissions, update the user's operational role
    if (roleAssignment && (actor.roles.includes("admin") || actor.roles.includes("direction") || actor.roles.includes("territorial_coordinator"))) {
      const [matchedRole] = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.key, roleAssignment))
        .limit(1);
      if (matchedRole) {
        await db
          .update(schema.userProfiles)
          .set({ roleId: matchedRole.id })
          .where(eq(schema.userProfiles.id, assignedUser));
      }
    }

    // 2. Normalize category to match event_reports constraint
    const validCategories = ['emergencia', 'incidencia', 'mitin', 'propaganda', 'servicios', 'sospechoso', 'brigada', 'bache', 'alumbrado', 'fuga_agua', 'inundacion', 'basura', 'seguridad', 'lona_danada'];
    let safeCategory = category;
    let activityPrefix = "";

    if (category === "platica") {
      safeCategory = "servicios";
      activityPrefix = "[Plática Vecinal] ";
    } else if (category === "visita") {
      safeCategory = "servicios";
      activityPrefix = "[Visita Domiciliaria] ";
    } else if (category === "evento") {
      safeCategory = "mitin";
      activityPrefix = "[Evento / Asamblea] ";
    } else if (category === "estructura") {
      safeCategory = "mitin";
      activityPrefix = "[Estructura Electoral] ";
    } else if (category === "perifoneo") {
      safeCategory = "propaganda";
      activityPrefix = "[Perifoneo / Activación] ";
    } else if (category === "apoyos") {
      safeCategory = "emergencia";
      activityPrefix = "[Logística / Apoyos] ";
    } else if (category === "brigada") {
      safeCategory = "brigada";
      activityPrefix = "[Brigada de Campo] ";
    } else if (!validCategories.includes(safeCategory)) {
      safeCategory = "brigada";
    }

    const fullTitle = title.trim().startsWith("[") || title.trim().includes("]") 
      ? title.trim() 
      : `${activityPrefix}${title.trim()}`;

    let enrichedDescription = description.trim();
    if (body.estimatedAttendees && Number(body.estimatedAttendees) > 0) {
      enrichedDescription = `Asistentes / Participantes Estimados: ${body.estimatedAttendees}\n${enrichedDescription}`;
    }
    if (locationText && locationText.trim()) {
      enrichedDescription = `Sede / Domicilio: ${locationText.trim()}\n${enrichedDescription}`;
    }

    // 3. Insert operational task into eventReports
    const [insertedTask] = await db
      .insert(schema.eventReports)
      .values({
        title: fullTitle,
        description: enrichedDescription || `Actividad registrada: ${fullTitle}`,
        latitude: Number(latitude) || 20.6248,
        longitude: Number(longitude) || -103.2422,
        category: safeCategory,
        municipality: municipality || "Tonalá",
        sectionId: sectionId || undefined,
        assignedToUserId: assignedUser,
        eventDate: scheduledDate,
        status: "active",
        mediaUrls: Array.isArray(body.mediaUrls) ? body.mediaUrls : undefined,
        createdByUserId: actor.actorId as string
      })
      .returning();

    // 3. If contactId is also provided, create or link a scheduled visit
    if (contactId) {
      // Find a default colony for the section if exists
      let colonyId: string | null = null;
      if (sectionId) {
        const secCol = await db
          .select({ colonyId: schema.sectionColonies.colonyId })
          .from(schema.sectionColonies)
          .where(eq(schema.sectionColonies.sectionId, sectionId))
          .limit(1);
        if (secCol.length > 0 && secCol[0]) colonyId = secCol[0].colonyId;
      }
      if (!colonyId) {
        const firstCol = await db.select({ id: schema.colonies.id }).from(schema.colonies).limit(1);
        if (firstCol.length > 0 && firstCol[0]) colonyId = firstCol[0].id;
      }

      if (colonyId) {
        await db.insert(schema.visits).values({
          id: crypto.randomUUID(),
          contactId: contactId,
          colonyId: colonyId,
          assignedUserId: assignedToUserId,
          scheduledAt: scheduledDate,
          status: "scheduled",
          visitLocationText: locationText.trim() || "Visita de vinculación en campo",
          createdByUserId: actor.actorId as string,
          createdAt: new Date()
        });
      }
    }

    // 4. Record audit log
    await db.insert(schema.auditLogs).values({
      actorUserId: actor.actorId as string,
      action: "agenda.task.create",
      entityType: "event_report",
      entityId: insertedTask?.id || crypto.randomUUID(),
      correlationId: actor.correlationId,
      beforeData: null,
      afterData: {
        title,
        assignedToUserId,
        scheduledAt,
        category,
        roleAssignment
      }
    });

    return NextResponse.json({ success: true, task: insertedTask }, { status: 201 });
  } catch (error) {
    console.error("Error creating operational task:", error);
    return NextResponse.json(
      { error: "Error interno al asignar la tarea u operación." },
      { status: 500 }
    );
  }
}
