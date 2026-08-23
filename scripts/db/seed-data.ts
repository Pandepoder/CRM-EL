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
  sourceName: "tonala-jalisco-v1",
  sourceVersion: "2026-08-14-v1"
} as const;

export const colonySeeds = [
  "Centro de Tonalá",
  "Loma Dorada Delegación A",
  "Loma Dorada Delegación B",
  "Loma Dorada Delegación C",
  "Loma Dorada Delegación D",
  "Coyula",
  "Puente Grande",
  "El Rosario",
  "Colonia Jalisco",
  "San Gaspar de las Flores",
  "Santa Cruz de las Huertas",
  "Santa Paula",
  "Tololotlán",
  "Zalatitán",
  "Alamedas de Zalatitán",
  "Arcos de Zalatitán",
  "Arroyo Seco",
  "Educadores Jaliscienses",
  "Misión de la Cantera",
  "Rincón del Mezquite",
  "20 de Noviembre",
  "Alfareros",
  "Barrio Nuevo",
  "Colonia del Sur",
  "Cihualpilli",
  "Agua Escondida",
  "Arroyo de Enmedio",
  "Basilio Badillo",
  "Bosques de Tonalá",
  "Buenavista",
  "Ciudad Aztlán",
  "Colinas de Tonalá"
] as const;
