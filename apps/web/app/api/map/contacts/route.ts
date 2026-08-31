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

export async function GET(_request: Request) {
  try {
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
        phone: schema.contacts.phone,
        colony: schema.contacts.colony,
        municipality: schema.contacts.municipality,
        panMilitancy: schema.contacts.panMilitancy,
        panMilitancyVerifiedAt: schema.contacts.panMilitancyVerifiedAt,
        exactLatitude: schema.contacts.exactLatitude,
        exactLongitude: schema.contacts.exactLongitude,
        createdByUserId: schema.contacts.createdByUserId,
        creatorName: schema.userProfiles.displayName,
        creatorAccessType: schema.userProfiles.accessType,
        createdAt: schema.contacts.createdAt
      })
      .from(schema.contacts)
      .leftJoin(schema.userProfiles, eq(schema.contacts.createdByUserId, schema.userProfiles.id))
      .where(eq(schema.contacts.status, "active"))
      .$dynamic();

    if (!networkScope.isGlobal && networkScope.allowedUserIds && networkScope.allowedUserIds.length > 0) {
      query = query.where(inArray(schema.contacts.createdByUserId, networkScope.allowedUserIds));
    }

    const contacts = await query;

    // Build features for map
    const features: any[] = [];

    contacts.forEach((c, idx) => {
      let lat = c.exactLatitude;
      let lng = c.exactLongitude;

      // If no exact GPS, generate a deterministic clustered point within Tonalá around center
      if (!lat || !lng) {
        // Deterministic offset based on string hash
        let hash = 0;
        for (let i = 0; i < c.id.length; i++) {
          hash = (hash << 5) - hash + c.id.charCodeAt(i);
          hash |= 0;
        }
        const offsetLat = ((hash % 1000) / 1000) * 0.05 - 0.025;
        const offsetLng = (((hash >> 3) % 1000) / 1000) * 0.05 - 0.025;
        lat = 20.6248 + offsetLat;
        lng = -103.2422 + offsetLng;
      }

      const colorIndex = Math.abs(c.createdByUserId.charCodeAt(0)) % NETWORK_COLORS.length;
      const networkColor = NETWORK_COLORS[colorIndex];

      features.push({
        type: "Feature",
        properties: {
          id: c.id,
          displayName: c.displayName,
          phone: decryptData(c.phone),
          colony: decryptData(c.colony) || "Tonalá",
          municipality: c.municipality || "Tonalá",
          panMilitancy: c.panMilitancy || "no_registrada",
          isPanConfirmed: c.panMilitancy === "confirmada",
          creatorName: c.creatorName || "Integrante",
          creatorAccessType: c.creatorAccessType || "conexion",
          networkColor,
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
      total: features.length
    });
  } catch (error: any) {
    console.error("Failed to fetch contacts for map:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
