import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { visibleContactIds, contactIdRestriction } from "@/lib/contact-visibility";

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
 * Centroide aproximado de cada sección pedida: promedio de los vértices de su anillo exterior,
 * calculado en Postgres. No es el centroide de área exacto, pero para posicionar un punto "en
 * algún lugar de esta sección" sobra, y evita cargar una librería geoespacial en una ruta que
 * ya es pesada.
 *
 * Antes el promedio se hacía en Node y para eso la consulta de contactos arrastraba el
 * `geom_json` completo de la sección de CADA contacto: 4.2 MB de geometría por petición
 * (medido con 3,286 contactos activos) para acabar quedándose con dos números, y la misma
 * sección repetida tantas veces como contactos le tocan. Ahora viaja una fila por sección, y
 * solo de las que hacen falta: las de contactos sin GPS propio, 211 de esos 3,286.
 */
async function centroidesDeSecciones(
  db: ReturnType<typeof getDatabaseClient>,
  sectionIds: readonly string[]
): Promise<Map<string, [number, number]>> {
  const centroides = new Map<string, [number, number]>();
  if (sectionIds.length === 0) return centroides;

  const { rows } = await db.execute<{ id: string; lng: number | null; lat: number | null }>(sql`
    SELECT es.id::text AS id, centro.lng, centro.lat
    FROM electoral_sections es
    CROSS JOIN LATERAL (
      SELECT AVG((p->>0)::float8) AS lng, AVG((p->>1)::float8) AS lat
      FROM jsonb_array_elements(
        -- Polygon -> [anillo][punto][x,y] ; MultiPolygon -> [polígono][anillo][punto][x,y]
        CASE WHEN es.geom_json->>'type' = 'MultiPolygon'
          THEN es.geom_json->'coordinates'->0->0
          ELSE es.geom_json->'coordinates'->0
        END
      ) AS p
    ) centro
    WHERE es.geom_json IS NOT NULL
      AND es.id IN (${sql.join(
        sectionIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )})
  `);

  for (const fila of rows) {
    const lng = Number(fila.lng);
    const lat = Number(fila.lat);
    // Una geometría malformada deja el promedio en NULL: esa sección simplemente no ubica a
    // nadie, igual que antes cuando el anillo venía vacío.
    if (Number.isFinite(lng) && Number.isFinite(lat)) centroides.set(fila.id, [lng, lat]);
  }
  return centroides;
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

    // Las condiciones se acumulan y se aplican juntas. Encadenar `.where()` dos
    // veces sobre una consulta `$dynamic()` no las suma: la segunda sustituye a
    // la primera. Aquí el filtro de red borraba al de estado, así que el mapa
    // devolvía también contactos archivados a todo el que no fuera administrador
    // —medido: 255 contactos frente a los 253 activos del administrador—.
    const condiciones: SQL[] = [eq(schema.contacts.status, "active")];
    // Los mismos contactos que el directorio: antes el mapa filtraba solo por creador y sin
    // territorio, así que pintaba puntos cuya ficha luego respondía "no encontrado".
    const restriccion = contactIdRestriction(await visibleContactIds(networkScope));
    if (restriccion) condiciones.push(restriccion);

    const query = db
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
        createdByUserId: schema.contacts.createdByUserId,
        creatorName: schema.userProfiles.displayName,
        creatorAccessType: schema.userProfiles.accessType,
        createdAt: schema.contacts.createdAt
      })
      .from(schema.contacts)
      .leftJoin(schema.userProfiles, eq(schema.contacts.createdByUserId, schema.userProfiles.id))
      .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
      .where(and(...condiciones));

    const contacts = await query;

    // Solo se piden los centroides que se van a usar: los de las secciones de contactos que no
    // traen GPS propio. El resto de los contactos ya tiene su punto medido.
    const seccionesPorUbicar = new Set<string>();
    for (const c of contacts) {
      if (c.sectionId && (c.exactLatitude == null || c.exactLongitude == null)) {
        seccionesPorUbicar.add(c.sectionId);
      }
    }
    const centroides = await centroidesDeSecciones(db, [...seccionesPorUbicar]);

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
        const centro = c.sectionId ? centroides.get(c.sectionId) : undefined;
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
          // Sin dato va vacío: antes se rellenaba con "Tonalá" y un contacto de cualquier
          // municipio sin colonia capturada aparecía viviendo en Tonalá.
          colony: decryptData(c.colony) || null,
          municipality: c.municipality || null,
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
