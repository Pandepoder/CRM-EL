export const roleSeeds = [
  { key: "admin", name: "Administrador" },
  { key: "direction", name: "Dirección" },
  { key: "territorial_coordinator", name: "Líder" },
  { key: "capturist", name: "Coordinador Territorial" },
  { key: "visit_responsible", name: "Brigadista" }
] as const;

/**
 * Usuarios que crea la semilla: fixtures para las pruebas de integracion y para tener
 * con que entrar en desarrollo local. No son un "modo demo" ni una funcion del producto.
 *
 * Todos usan el dominio .local, reservado por RFC 6762 y por tanto incapaz de coincidir
 * con un correo de trabajo. Antes esta lista incluia admin@tonala.gob.mx y
 * admin@elapp.com.mx, que son valores por omision de ADMIN_EMAIL: como el upsert reescribe
 * password_hash, sembrar sobre una base real le cambiaba la contrasena al administrador.
 *
 * Si agregas uno, usa .local. tests/unit/seed-user-isolation.test.ts falla si no lo haces.
 */
export const userSeeds = [
  {
    email: "admin@pruebas.local",
    displayName: "Admin de Pruebas",
    roleKey: "admin"
  },
  {
    email: "coordinador@pruebas.local",
    displayName: "Coordinador de Pruebas",
    roleKey: "territorial_coordinator"
  },
  {
    email: "capturista@pruebas.local",
    displayName: "Capturista de Pruebas",
    roleKey: "capturist"
  },
  {
    email: "responsable@pruebas.local",
    displayName: "Responsable de Pruebas",
    roleKey: "visit_responsible"
  },
  {
    email: "direccion@pruebas.local",
    displayName: "Direccion de Pruebas",
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
