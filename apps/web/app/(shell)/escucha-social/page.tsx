import { getDatabaseClient } from "@/lib/db-client";
import { getServerSession } from "@/lib/session-server";
import { requirePageAccess } from "@/lib/authorization";
import { schema } from "@tonala/shared/database";
import { eq, desc, sql } from "drizzle-orm";
import { condicionParaTrabajarPorAutor, condicionPorAutor } from "@/lib/alcance-municipal";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import EscuchaSocialClient from "./EscuchaSocialClient";

export default async function EscuchaSocialPage() {
  // La guarda común, como el resto del panel (M9): antes esta pantalla solo miraba la cookie y
  // redirigía a mano, sin comprobar que la cuenta siguiera activa ni su rol.
  await requirePageAccess("/escucha-social");
  const session = await getServerSession();

  const db = getDatabaseClient();
  const networkScope = await resolveUserNetworkScope(session.userId);
  // Aprueba gestiones formales administración (el maestro o la municipal, sobre lo que ve); dirección
  // y accessType no conceden eso.
  const isCoordinacion = networkScope.isAdmin;
  // Ver no es trabajar (A20): lo que se ve pero no se atiende sale como «solo consulta».
  const trabajable = condicionParaTrabajarPorAutor(networkScope, schema.socialListening.municipalityId, schema.socialListening.createdByUserId);

  let query = db
    .select({
      id: schema.socialListening.id,
      contactId: schema.socialListening.contactId,
      categories: schema.socialListening.categories,
      title: schema.socialListening.title,
      description: schema.socialListening.description,
      photoUrls: schema.socialListening.photoUrls,
      latitude: schema.socialListening.latitude,
      longitude: schema.socialListening.longitude,
      locationText: schema.socialListening.locationText,
      status: schema.socialListening.status,
      isFormalGestion: schema.socialListening.isFormalGestion,
      approvedByUserId: schema.socialListening.approvedByUserId,
      resolutionNotes: schema.socialListening.resolutionNotes,
      createdByUserId: schema.socialListening.createdByUserId,
      createdByName: schema.userProfiles.displayName,
      createdAt: schema.socialListening.createdAt,
      puedeTrabajar: trabajable ? sql<boolean>`coalesce(${trabajable}, false)` : sql<boolean>`true`
    })
    .from(schema.socialListening)
    .leftJoin(schema.userProfiles, eq(schema.socialListening.createdByUserId, schema.userProfiles.id))
    .$dynamic();

  // Sin alcance no se ve nada: la guarda vieja exigía una lista no vacía y, vacía, mostraba todo.
  const visibles = condicionPorAutor(networkScope, schema.socialListening.municipalityId, schema.socialListening.createdByUserId);
  if (visibles) query = query.where(visibles);

  const items = await query.orderBy(desc(schema.socialListening.createdAt));

  const serialized = items.map(item => ({
    ...item,
    categories: Array.isArray(item.categories) ? item.categories as string[] : [String(item.categories)],
    photoUrls: Array.isArray(item.photoUrls) ? item.photoUrls as string[] : [],
    createdAt: item.createdAt ? item.createdAt.toISOString() : new Date().toISOString()
  }));

  return (
    <EscuchaSocialClient
      initialItems={serialized}
      isCoordinacion={isCoordinacion}
      currentUserId={session.userId}
    />
  );
}
