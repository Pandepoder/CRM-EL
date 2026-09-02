import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { eq, inArray } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

// Assigned color palette for teams/networks
const NETWORK_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#475569"  // slate
];

/**
 * Centroide aproximado de la geometría de una sección: promedio de los vértices
 * del anillo exterior. No es el centroide de área exacto, pero para posicionar
 * un punto "en algún lugar de esta sección" sobra, y evita cargar una librería
 * geoespacial en una ruta que ya es pesada.
 */
function sectionCentroid(geom: unknown): [number, number] | null {
  const g = geom as { type?: string; coordinates?: unknown } | null;
  if (!g?.coordinates) return null;

  // Polygon -> [ring][point][x,y] ; MultiPolygon -> [poly][ring][point][x,y]
  const ring =
    g.type === "MultiPolygon"
      ? (g.coordinates as number[][][][])[0]?.[0]
      : (g.coordinates as number[][][])[0];

  if (!Array.isArray(ring) || ring.length === 0) return null;

  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const [x, y] = p as [number, number];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    sx += x;
    sy += y;
    n += 1;
  }
  return n > 0 ? [sx / n, sy / n] : null;
}

export async function GET(request: Request) {
  try {
    // Recuadro visible opcional: "minLng,minLat,maxLng,maxLat". Sin él la ruta
    // se comporta igual que siempre y devuelve todo el alcance, así que ningún
    // consumidor existente cambia de comportamiento.
    const bboxParam = new URL(request.url).searchParams.get("bbox");
    let bbox: [number, number, number, number] | null = null;
    if (bboxParam) {
      const p = bboxParam.split(",").map(Number);
      if (p.length === 4 && p.every(Number.isFinite)) {
        bbox = [p[0]!, p[1]!, p[2]!, p[3]!];
      }
    }

    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDatabaseClient();
    const networkScope = await resolveUserNetworkScope(session.userId);

    let query = db
      .select({
        id: schema.contacts.id,
        displayName: schema.contacts.displayName,
        colony: schema.contacts.colony,
        municipality: schema.contacts.municipality,
        panMilitancy: schema.contacts.panMilitancy,
        panMilitancyVerifiedAt: schema.contacts.panMilitancyVerifiedAt,
        exactLatitude: schema.contacts.exactLatitude,
        exactLongitude: schema.contacts.exactLongitude,
        sectionId: schema.contacts.sectionId,
        sectionNum: schema.electoralSections.sectionNum,
        sectionGeom: schema.electoralSections.geomJson,
        createdByUserId: schema.contacts.createdByUserId,
        creatorName: schema.userProfiles.displayName,
        creatorAccessType: schema.userProfiles.accessType,
        createdAt: schema.contacts.createdAt
      })
      .from(schema.contacts)
      .leftJoin(schema.userProfiles, eq(schema.contacts.createdByUserId, schema.userProfiles.id))
      .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
      .where(eq(schema.contacts.status, "active"))
      .$dynamic();

    if (!networkScope.isGlobal && networkScope.allowedUserIds && networkScope.allowedUserIds.length > 0) {
      query = query.where(inArray(schema.contacts.createdByUserId, networkScope.allowedUserIds));
    }

    const contacts = await query;

    // Build features for map
    const features: any[] = [];

    // Un contacto sin GPS no se inventa. Antes se le calculaba un punto a partir
    // del hash de su id dentro de un cuadro de ±0.025° alrededor del centro de
    // Tonalá: en campo eso mandaba al brigadista a un domicilio inexistente, y
    // nada en el mapa distinguía ese punto de uno medido. Ahora, sin GPS se cae
    // al centroide de su sección electoral —una aproximación con significado
    // real— marcada como tal, y si tampoco hay sección el contacto no se dibuja.
    let omitidosSinUbicacion = 0;
    let fueraDelRecuadro = 0;

    contacts.forEach((c) => {
      let lat = c.exactLatitude;
      let lng = c.exactLongitude;
      let precision: "exacta" | "seccion" = "exacta";

      if (lat == null || lng == null) {
        const centro = sectionCentroid(c.sectionGeom);
        if (!centro) {
          omitidosSinUbicacion += 1;
          return;
        }
        [lng, lat] = centro;
        precision = "seccion";
      }

      // Fuera del recuadro visible no se envía: el contacto sigue contando en
      // `cobertura`, para que la interfaz muestre el total real y no solo lo
      // que cabe en pantalla.
      if (bbox && (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3])) {
        fueraDelRecuadro += 1;
        return;
      }

      const colorIndex = Math.abs(c.createdByUserId.charCodeAt(0)) % NETWORK_COLORS.length;
      const networkColor = NETWORK_COLORS[colorIndex];

      features.push({
        type: "Feature",
        properties: {
          id: c.id,
          displayName: c.displayName,
          // El teléfono se retiró del GeoJSON: el mapa no lo usa en ninguna parte
          // y se enviaba descifrado para todos los contactos del alcance. Si algún
          // día hace falta en el detalle, se pide al abrir la ficha.
          colony: decryptData(c.colony) || "Tonalá",
          municipality: c.municipality || "Tonalá",
          panMilitancy: c.panMilitancy || "no_registrada",
          isPanConfirmed: c.panMilitancy === "confirmada",
          creatorName: c.creatorName || "Integrante",
          creatorAccessType: c.creatorAccessType || "conexion",
          networkColor,
          // El cliente pinta distinto lo aproximado para que nadie lo confunda
          // con un domicilio verificado.
          precision,
          isApproximate: precision !== "exacta",
          sectionNum: c.sectionNum ?? null,
          createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString()
        },
        geometry: {
          type: "Point",
          coordinates: [lng, lat]
        }
      });
    });

    return NextResponse.json({
      type: "FeatureCollection",
      features,
      total: features.length,
      // El cliente necesita poder decir "289 registros, 155 ubicables" en vez de
      // fingir que dibujó todo.
      cobertura: {
        contactos: contacts.length,
        dibujados: features.length,
        exactos: features.filter((f) => f.properties.precision === "exacta").length,
        porSeccion: features.filter((f) => f.properties.precision === "seccion").length,
        sinUbicacion: omitidosSinUbicacion,
        fueraDeVista: fueraDelRecuadro,
        // Ubicables en todo el alcance, dentro y fuera de la vista. Es el número
        // que debe mostrar el contador, no el de lo dibujado.
        ubicables: features.length + fueraDelRecuadro
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch contacts for map:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
