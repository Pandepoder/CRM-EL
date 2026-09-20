import { NextResponse } from "next/server";
import { schema } from "@tonala/shared/database";
import { withOutbox } from "@/lib/outbox-helper";
import { requireActorRoles } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function POST(request: Request) {
  // La guarda miraba el rol guardado en la cookie de sesión, que no se revalida: a quien le
  // bajaron el rol o le dieron de baja la cuenta seguía nombrando representantes hasta que
  // esa cookie caducara. requireActorRoles vuelve a leer rol y estado en la base.
  const actor = await requireActorRoles("admin", "direction", "territorial_coordinator");
  if (actor instanceof NextResponse) return actor;

  try {
    const { sectionId, userId, role } = await request.json();
    if (!sectionId || !userId || !role) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // El nombramiento tomaba el userId del cuerpo tal cual: un coordinador podía poner de
    // representante a cualquier persona del sistema, incluso de otra dirección, y quedaba
    // registrada a su nombre. Solo se puede nombrar a alguien del propio alcance.
    const alcance = await resolveUserNetworkScope(actor.actorId);
    if (!alcance.isGlobal && !(alcance.allowedUserIds ?? []).includes(userId)) {
      return NextResponse.json(
        { error: "Solo puedes nombrar representante a alguien de tu equipo." },
        { status: 403 }
      );
    }

    await withOutbox("electoral_representative", userId, "RepresentativeAssigned.v1", { sectionId, userId, role }, actor.actorId, async (tx) => {
      await tx.insert(schema.electoralRepresentatives).values({
        sectionId,
        userId,
        role
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === '23505') {
       return NextResponse.json({ error: "El usuario ya está asignado a esta sección" }, { status: 400 });
    }
    console.error("Failed to assign representative:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
