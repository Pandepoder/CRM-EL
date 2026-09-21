import { NextResponse } from "next/server";
import { z } from "zod";

import { requireLiderParaIncidencias } from "@/lib/authorization";
import { crearActividad } from "@/lib/actividades-servicio";

export const dynamic = "force-dynamic";

const uuid = z.string().uuid();

const cuerpoCrear = z.object({
  title: z.string().min(1, "El título es obligatorio."),
  description: z.string().optional(),
  assignedToUserId: uuid.nullish().or(z.literal("").transform(() => null)),
  scheduledAt: z.string().min(1, "La fecha es obligatoria."),
  activityTypeId: uuid.nullish().or(z.literal("").transform(() => null)),
  // Clientes anteriores mandaban la clave del tipo en `category` (platica, visita…).
  category: z.string().optional(),
  tagIds: z.array(uuid).max(12).optional(),
  sectionId: uuid.nullish().or(z.literal("").transform(() => null)),
  contactId: uuid.nullish().or(z.literal("").transform(() => null)),
  locationText: z.string().max(240).optional(),
  estimatedAttendees: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((v) => (v === null || v === undefined || v === "" ? null : Number(v))),
  latitude: z.number(),
  longitude: z.number(),
  municipality: z.string().nullish(),
  mediaUrls: z.array(z.unknown()).max(20).optional(),
  clientRequestId: uuid.nullish(),
  modo: z.enum(["programar", "registrar"]).default("programar"),
  resultado: z.object({ outcome: z.string(), summary: z.string() }).optional(),
  roleAssignment: z.unknown().optional()
});

export async function POST(req: Request) {
  // Esta ruta también da de alta incidencias en el mapa, así que exige lo mismo que
  // /api/map/reports: solo quien lidera puede levantarlas.
  const actor = await requireLiderParaIncidencias();
  if (actor instanceof NextResponse) return actor;

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }

  // Los roles solo se cambian desde Control de Usuarios. Antes esta ruta aceptaba
  // `roleAssignment` y reescribía el rol de cualquiera; sigue rechazándose de forma explícita.
  if (cuerpo && typeof cuerpo === "object" && (cuerpo as Record<string, unknown>).roleAssignment) {
    return NextResponse.json({ error: "Los roles solo se cambian desde Control de Usuarios." }, { status: 400 });
  }

  const analizado = cuerpoCrear.safeParse(cuerpo);
  if (!analizado.success) {
    // El primer problema, con el campo al que pertenece, para que el formulario lo marque.
    const problema = analizado.error.issues[0];
    return NextResponse.json(
      { error: problema?.message ?? "Datos no válidos.", campo: String(problema?.path[0] ?? "") },
      { status: 400 }
    );
  }
  const c = analizado.data;

  try {
    const r = await crearActividad(actor, {
      title: c.title,
      description: c.description,
      assignedToUserId: c.assignedToUserId,
      scheduledAt: c.scheduledAt,
      activityTypeId: c.activityTypeId,
      categoriaHeredada: c.category,
      tagIds: c.tagIds,
      sectionId: c.sectionId,
      contactId: c.contactId,
      locationText: c.locationText,
      estimatedAttendees: c.estimatedAttendees,
      latitude: c.latitude,
      longitude: c.longitude,
      municipality: c.municipality,
      mediaUrls: c.mediaUrls,
      clientRequestId: c.clientRequestId,
      modo: c.modo,
      resultado: c.resultado
    });
    if (!r.ok) {
      return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
    }
    return NextResponse.json(
      { success: true, task: r.actividad, duplicada: r.duplicada, avisos: r.avisos },
      { status: r.duplicada ? 200 : 201 }
    );
  } catch (error) {
    console.error("Error creating operational task:", error);
    return NextResponse.json({ error: "Error interno al registrar la actividad." }, { status: 500 });
  }
}
