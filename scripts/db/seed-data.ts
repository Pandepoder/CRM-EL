export const roleSeeds = [
  { key: "admin", name: "Administrador" },
  { key: "direction", name: "Dirección" },
  { key: "territorial_coordinator", name: "Líder" },
  { key: "capturist", name: "Coordinador Territorial" },
  { key: "visit_responsible", name: "Brigadista" }
] as const;

/**
 * Cuentas de demostracion. TODAS usan el dominio .local a proposito.
 *
 * Antes esta lista incluia admin@tonala.gob.mx, admin@elapp.com.mx,
 * coord.centro@tonala.gob.mx y brigada.norte@tonala.gob.mx. Esos correos no son
 * ficticios: admin@elapp.com.mx es el valor por omision de ADMIN_EMAIL en
 * docker-compose.yml y el que scripts/deploy-vps.py escribe en el .env del
 * servidor, y admin@tonala.gob.mx es el del .env.example y del Administrador
 * Maestro de clean-production.ts. Como el upsert de seeds.ts reescribe
 * password_hash, sembrar sobre una base real le cambiaba la contrasena al
 * administrador de produccion por la de demostracion.
 *
 * .local esta reservado y no puede resolver a un dominio real (RFC 6762), asi
 * que ninguna cuenta de aqui puede colisionar con una cuenta de trabajo. Los
 * cinco roles quedan cubiertos; los correos retirados solo duplicaban roles.
 *
 * Si agregas una cuenta, usa .local. La prueba en
 * tests/unit/demo-seed-isolation.test.ts falla si no lo haces.
 */
export const demoUserSeeds = [
  {
    email: "admin.demo@tonala-os.local",
    displayName: "Admin Demo",
    roleKey: "admin"
  },
  {
    email: "coordinador.demo@tonala-os.local",
    displayName: "Coordinador Demo",
    roleKey: "territorial_coordinator"
  },
  {
    email: "capturista.demo@tonala-os.local",
    displayName: "Capturista Demo",
    roleKey: "capturist"
  },
  {
    email: "responsable.demo@tonala-os.local",
    displayName: "Responsable Demo",
    roleKey: "visit_responsible"
  },
  {
    email: "direccion.demo@tonala-os.local",
    displayName: "Direccion Demo",
    roleKey: "direction"
  }
] as const;

export const catalogSeed = {
  catalogType: "colonies",
  sourceName: "jalisco-metropolitan-official",
  sourceVersion: "2026-08-28-metro-v1"
} as const;

import { METROPOLITAN_SECTIONS } from "./generate-metropolitan-sections.js";

// Extract all unique colonies with their municipality
const uniqueColoniesMap = new Map<string, string>();
for (const sec of METROPOLITAN_SECTIONS) {
  for (const c of sec.colonies) {
    if (!uniqueColoniesMap.has(c)) {
      uniqueColoniesMap.set(c, sec.municipality);
    }
  }
}

export const colonySeeds = Array.from(uniqueColoniesMap.entries()).map(([name, municipality]) => ({
  name,
  postalCode: "45400",
  municipality
}));

import { boundsToRealisticPolygon } from "./generate-official-sections.js";

export const electoralSectionSeeds = METROPOLITAN_SECTIONS.map((sec) => ({
  sectionNum: sec.sectionNum,
  colonies: sec.colonies,
  municipality: sec.municipality,
  geom: boundsToRealisticPolygon(sec.sectionNum, sec.bounds)
}));

export const incidentReportCategorySeeds = [
  "logistics",
  "security",
  "irregularity",
  "general"
] as const;
