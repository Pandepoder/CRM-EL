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

    // Las tres escrituras van juntas. Antes eran secuenciales y sin transacción:
    // si la visita o la auditoría fallaban, la actividad ya estaba guardada y el
    // usuario veía "Error interno" sobre algo que en realidad sí se había creado.
    const insertedTask = await db.transaction(async (tx) => {
      const [task] = await tx
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

      // Si además se indicó un contacto, se agenda la visita asociada.
      if (contactId) {
        let colonyId: string | null = null;
        if (sectionId) {
          const secCol = await tx
            .select({ colonyId: schema.sectionColonies.colonyId })
            .from(schema.sectionColonies)
            .where(eq(schema.sectionColonies.sectionId, sectionId))
            .limit(1);
          if (secCol.length > 0 && secCol[0]) colonyId = secCol[0].colonyId;
        }
        if (!colonyId) {
          const firstCol = await tx.select({ id: schema.colonies.id }).from(schema.colonies).limit(1);
          if (firstCol.length > 0 && firstCol[0]) colonyId = firstCol[0].id;
        }

        if (colonyId) {
          await tx.insert(schema.visits).values({
            id: crypto.randomUUID(),
            contactId: contactId,
            colonyId: colonyId,
            // `visits.assigned_user_id` es NOT NULL. Aquí se usaba el campo crudo
            // del cuerpo en vez de `assignedUser`, que es el que ya aplica el
            // respaldo al actor: sin responsable explícito llegaba null y el
            // INSERT reventaba con la actividad ya creada.
            assignedUserId: assignedUser,
            scheduledAt: scheduledDate,
            status: "scheduled",
            visitLocationText: locationText.trim() || "Visita de vinculación en campo",
            createdByUserId: actor.actorId as string,
            createdAt: new Date()
          });
        }
      }

      await tx.insert(schema.auditLogs).values({
        actorUserId: actor.actorId as string,
        action: "agenda.task.create",
        entityType: "event_report",
        entityId: task?.id || crypto.randomUUID(),
        correlationId: actor.correlationId,
        beforeData: null,
        afterData: {
          title,
          assignedToUserId: assignedUser,
          scheduledAt,
          category,
          roleAssignment
        }
      });

      return task;
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
