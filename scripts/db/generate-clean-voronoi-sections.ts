import "dotenv/config";
import pg from "pg";
import { loadAppEnv } from "../../packages/config/index.js";
import { METROPOLITAN_SECTIONS, type MetropolitanSectionDefinition } from "./generate-metropolitan-sections.js";

const env = loadAppEnv();
const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

type Point = [number, number]; // [lng, lat]
type Polygon = Point[];

// Sutherland-Hodgman Polygon Clipping against a Half-Plane
// Keeps the half-plane containing seed point (pSeed)
function clipPolygonAgainstBisector(
  subjectPoly: Polygon,
  pSeed: Point,
  pOther: Point
): Polygon {
  if (subjectPoly.length < 3) return subjectPoly;

  // Midpoint between pSeed and pOther
  const mx = (pSeed[0] + pOther[0]) / 2;
  const my = (pSeed[1] + pOther[1]) / 2;

  // Normal pointing from pOther toward pSeed
  const nx = pSeed[0] - pOther[0];
  const ny = pSeed[1] - pOther[1];

  // Function to test if a point (px, py) is on the seed side of the line
  const isInside = (p: Point): boolean => {
    return (p[0] - mx) * nx + (p[1] - my) * ny >= -1e-10;
  };

  // Line-line intersection between segment (p1->p2) and bisector line
  const computeIntersection = (p1: Point, p2: Point): Point => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const denom = dx * nx + dy * ny;
    if (Math.abs(denom) < 1e-12) return p1;
    const t = ((mx - p1[0]) * nx + (my - p1[1]) * ny) / denom;
    return [
      Number((p1[0] + t * dx).toFixed(6)),
      Number((p1[1] + t * dy).toFixed(6))
    ];
  };

  const outputList: Point[] = [];
  const len = subjectPoly.length;

  for (let i = 0; i < len; i++) {
    const current = subjectPoly[i]!;
    const prev = subjectPoly[(i + len - 1) % len]!;

    const currentInside = isInside(current);
    const prevInside = isInside(prev);

    if (currentInside) {
      if (!prevInside) {
        outputList.push(computeIntersection(prev, current));
      }
      outputList.push(current);
    } else if (prevInside) {
      outputList.push(computeIntersection(prev, current));
    }
  }

  return outputList;
}

export function generateSeamlessVoronoiSections(sections: MetropolitanSectionDefinition[]) {
  // Group sections by municipality
  const muniGroups = new Map<string, Array<{ def: MetropolitanSectionDefinition; centroid: Point }>>();

  for (const s of sections) {
    const muni = s.municipality || "Tonalá";
    const cLng = (s.bounds.minLng + s.bounds.maxLng) / 2;
    const cLat = (s.bounds.minLat + s.bounds.maxLat) / 2;
    if (!muniGroups.has(muni)) {
      muniGroups.set(muni, []);
    }
    muniGroups.get(muni)!.push({ def: s, centroid: [cLng, cLat] });
  }

  const results: Array<{ sectionNum: number; municipality: string; geom: any }> = [];

  for (const [muni, secItems] of muniGroups.entries()) {
    // Determine the bounding envelope for this municipality with a slight margin
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const item of secItems) {
      minLng = Math.min(minLng, item.def.bounds.minLng);
      maxLng = Math.max(maxLng, item.def.bounds.maxLng);
      minLat = Math.min(minLat, item.def.bounds.minLat);
      maxLat = Math.max(maxLat, item.def.bounds.maxLat);
    }

    // Add padding to envelope
    const padLng = (maxLng - minLng) * 0.08 || 0.01;
    const padLat = (maxLat - minLat) * 0.08 || 0.01;
    const bMinLng = minLng - padLng;
    const bMaxLng = maxLng + padLng;
    const bMinLat = minLat - padLat;
    const bMaxLat = maxLat + padLat;

    // For each section, start with the municipal envelope and clip against all other sections in this municipality
    for (let i = 0; i < secItems.length; i++) {
      const current = secItems[i]!;
      let poly: Polygon = [
        [bMinLng, bMinLat],
        [bMaxLng, bMinLat],
        [bMaxLng, bMaxLat],
        [bMinLng, bMaxLat]
      ];

      for (let j = 0; j < secItems.length; j++) {
        if (i === j) continue;
        const other = secItems[j]!;
        poly = clipPolygonAgainstBisector(poly, current.centroid, other.centroid);
      }

      // Close polygon ring
      if (poly.length >= 3) {
        const closedPoly = [...poly, poly[0]!];
        results.push({
          sectionNum: current.def.sectionNum,
          municipality: muni,
          geom: {
            type: "Polygon",
            coordinates: [closedPoly]
          }
        });
      }
    }
  }

  return results;
}

export async function run() {
  console.log("Generating seamless non-overlapping Voronoi tessellation for all sections...");
  const voronoiSections = generateSeamlessVoronoiSections(METROPOLITAN_SECTIONS);
  console.log(`Generated ${voronoiSections.length} clean, non-overlapping polygonal sections.`);

  for (const s of voronoiSections) {
    await pool.query(
      `UPDATE electoral_sections SET geom_json = $1 WHERE section_num = $2`,
      [JSON.stringify(s.geom), s.sectionNum]
    );
  }

  console.log("Database updated successfully with seamless electoral sections!");
  await pool.end();
}

if (process.argv[1]?.includes("generate-clean-voronoi-sections")) {
  run().catch(console.error);
}
