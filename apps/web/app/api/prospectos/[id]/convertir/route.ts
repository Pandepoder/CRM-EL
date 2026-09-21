import { NextResponse } from "next/server";
import { z } from "zod";

import { Permission, requireActorPermission } from "@/lib/authorization";
import { convertirProspecto, revisarConversion } from "@/lib/prospectos-servicio";
import { safeErrorMessage } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cuerpo = z.object({
  /** "revisar" solo informa si ya está convertido y qué contactos se le parecen. */
  accion: z.enum(["revisar", "convertir"]).default("convertir"),
  contactoExistenteId: z.string().uuid().optional(),
  confirmarNuevo: z.boolean().optional()
});

/**
 * Convierte un prospecto en contacto, o lo enlaza con uno que ya existe. Es una sola operación:
 * contacto, nota con lo acordado y marca en el prospecto se guardan juntos o no se guarda nada.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Convertir da de alta una ficha de ciudadano: exige el mismo permiso que el alta de contactos.
    const actor = await requireActorPermission(Permission.ContactsCreate);
    if (actor instanceof NextResponse) return actor;
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });

    let crudo: unknown = {};
    try { crudo = await req.json(); } catch { /* sin cuerpo: convertir por omisión */ }
    const a = cuerpo.safeParse(crudo ?? {});
    if (!a.success) return NextResponse.json({ error: a.error.issues[0]?.message ?? "Datos no válidos." }, { status: 400 });

    if (a.data.accion === "revisar") {
      const r = await revisarConversion(actor, id);
      if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
      return NextResponse.json({ yaConvertido: r.yaConvertido, contactId: r.contactId, posibles: r.posibles });
    }

    const r = await convertirProspecto(actor, id, { contactoExistenteId: a.data.contactoExistenteId, confirmarNuevo: a.data.confirmarNuevo });
    if (!r.ok) {
      return NextResponse.json(
        { error: r.message, code: r.code, ...("posibles" in r ? { posibles: r.posibles } : {}) },
        { status: r.status }
      );
    }
    return NextResponse.json({
      success: true,
      contactId: r.contactId,
      yaConvertido: r.yaConvertido,
      message: r.yaConvertido
        ? "Este prospecto ya había sido convertido."
        : r.creado ? "Prospecto convertido en contacto." : "Prospecto vinculado al contacto existente."
    });
  } catch (error: unknown) {
    console.error("Error converting prospect:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al convertir prospecto.") }, { status: 500 });
  }
}
