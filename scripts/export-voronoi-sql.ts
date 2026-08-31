import fs from "fs";
import { generateSeamlessVoronoiSections } from "./db/generate-clean-voronoi-sections.js";
import { METROPOLITAN_SECTIONS } from "./db/generate-metropolitan-sections.js";

console.log("Generating Voronoi SQL file...");
const sections = generateSeamlessVoronoiSections(METROPOLITAN_SECTIONS);
console.log(`Computed Voronoi geometries for ${sections.length} sections.`);

const statements: string[] = ["BEGIN;"];
for (const s of sections) {
  const jsonStr = JSON.stringify(s.geom).replace(/'/g, "''");
  statements.push(`UPDATE electoral_sections SET geom_json = '${jsonStr}' WHERE section_num = ${s.sectionNum};`);
}
statements.push("COMMIT;");

const sqlContent = statements.join("\n");
fs.writeFileSync("scripts/voronoi_updates.sql", sqlContent, "utf-8");
console.log("Wrote scripts/voronoi_updates.sql successfully!");
