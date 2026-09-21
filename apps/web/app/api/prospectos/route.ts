import { NextResponse } from "next/server";
import { z } from "zod";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { crearProspecto, listarProspectos } from "@/lib/prospectos-servicio";
import { safeErrorMessage } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lista paginada con búsqueda y filtros, acotada al alcance de red de quien consulta. */
export async function GET(req: Request) {
  try {
    const actor = await actorFromSession();
    if (!actor) return unauthorized();

    const url = new URL(req.url);
    const perfil = url.searchParams.get("perfil");
    const estado = url.searchParams.get("estado");
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const r = await listarProspectos(alcance, {
      q: (url.searchParams.get("q") ?? "").trim().slice(0, 80),
      disposicion: url.searchParams.get("disposicion") || null,
      perfilId: perfil && UUID.test(perfil) ? perfil : null,
      estado: estado === "pendientes" || estado === "convertidos" ? estado : null,
      pagina: Math.max(1, Math.min(500, Number(url.searchParams.get("pagina")) || 1))
    });
    return NextResponse.json(r);
  } catch (error: unknown) {
    console.error("Error in GET /api/prospectos:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al obtener prospectos.") }, { status: 500 });
  }
}

const cuerpoProspecto = z.object({
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

export async function POST(req: Request) {
  try {
    // `actorFromSession` vuelve a comprobar en la base que la cuenta siga activa.
    const actor = await actorFromSession();
    if (!actor) return unauthorized();

    let cuerpo: unknown;
    try { cuerpo = await req.json(); } catch { return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 }); }
    const a = cuerpoProspecto.safeParse(cuerpo);
    if (!a.success) return NextResponse.json({ error: a.error.issues[0]?.message ?? "Datos no válidos." }, { status: 400 });

    const r = await crearProspecto(actor, a.data);
    if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
    return NextResponse.json({ success: true, item: r.prospecto }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST /api/prospectos:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al registrar prospecto.") }, { status: 500 });
  }
}
