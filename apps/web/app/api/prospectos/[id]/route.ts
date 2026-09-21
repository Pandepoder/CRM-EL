import { NextResponse } from "next/server";
import { z } from "zod";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { editarProspecto } from "@/lib/prospectos-servicio";
import { safeErrorMessage } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cuerpo = z.object({
  prospectName: z.string().optional(),
  organizationOrReference: z.string().nullish(),
  profileOptionId: z.string().uuid().nullish().or(z.literal("").transform(() => null)),
  disposition: z.string().optional(),
  dispositionNotes: z.string().nullish(),
  activityDate: z.string().optional(),
  locationText: z.string().nullish(),
  commitments: z.string().nullish(),
  privateNotes: z.string().nullish(),
  nextStep: z.string().nullish(),
  nextStepAt: z.string().nullish()
});

/** Edita un prospecto que aún no se ha convertido en contacto. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await actorFromSession();
    if (!actor) return unauthorized();
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "Prospecto no encontrado." }, { status: 404 });

    let crudo: unknown;
    try { crudo = await req.json(); } catch { return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 }); }
    const a = cuerpo.safeParse(crudo);
    if (!a.success) return NextResponse.json({ error: a.error.issues[0]?.message ?? "Datos no válidos." }, { status: 400 });

    const r = await editarProspecto(actor, id, a.data);
    if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
    return NextResponse.json({ success: true, item: r.prospecto });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/prospectos/[id]:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al guardar el prospecto.") }, { status: 500 });
  }
}
