export const roleSeeds = [
  { key: "admin", name: "Administrador" },
  { key: "direction", name: "Direccion" },
  { key: "territorial_coordinator", name: "Coordinador territorial" },
  { key: "capturist", name: "Capturista" },
  { key: "visit_responsible", name: "Responsable de visita" }
] as const;

export const demoUserSeeds = [
  {
    email: "admin.demo@tonala-os.local",
    displayName: "Admin Demo",
    roleKey: "admin"
  },
  {
    email: "admin@tonala.gob.mx",
    displayName: "Administrador Tonalá",
    roleKey: "admin"
  },
  {
    email: "admin@elapp.com.mx",
    displayName: "Administrador ElApp",
    roleKey: "admin"
  },
  {
    email: "coordinador.demo@tonala-os.local",
    displayName: "Coordinador Demo",
    roleKey: "territorial_coordinator"
  },
  {
    email: "coord.centro@tonala.gob.mx",
    displayName: "Coordinador Centro",
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
    email: "brigada.norte@tonala.gob.mx",
    displayName: "Brigadista Norte",
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
