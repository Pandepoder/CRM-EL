import { describe, expect, it } from "vitest";

import { demoUserSeeds, roleSeeds } from "../../scripts/db/seed-data.js";

/**
 * Separación de entornos entre cuentas de demostración y cuentas de trabajo.
 *
 * Estas pruebas existen por un defecto concreto: `demoUserSeeds` llegó a incluir
 * `admin@tonala.gob.mx` y `admin@elapp.com.mx`, que no son correos ficticios sino los
 * valores por omisión de `ADMIN_EMAIL` en `.env.example`, en `docker-compose.yml` y en el
 * `.env` que `scripts/deploy-vps.py` escribe en el servidor. Como la semilla hace
 * `ON CONFLICT (email) DO UPDATE SET password_hash`, sembrar sobre una base real le
 * cambiaba la contraseña al administrador de producción por la de demostración.
 *
 * El riesgo no se arregla de una vez: vuelve en cuanto alguien añada una cuenta demo con
 * un correo que parezca institucional. De ahí que esto sea una prueba y no un comentario.
 */

/** `.local` está reservado por RFC 6762 y no puede resolver a un dominio real. */
const DOMINIOS_DE_DEMO_PERMITIDOS = [".local", ".invalid", ".test", ".example"];

/**
 * Correos que alguna configuración del proyecto usa como cuenta administrativa real.
 * Ninguna cuenta de demostración puede coincidir con estos.
 */
const CORREOS_ADMINISTRATIVOS_REALES = [
  "admin@tonala.gob.mx", // .env.example y clean-production.ts (Administrador Maestro)
  "admin@elapp.com.mx"   // docker-compose.yml y deploy-vps.py (admin del servidor)
];

describe("aislamiento de las cuentas de demostración", () => {
  it("todas usan un dominio reservado que no puede ser real", () => {
    const intrusas = demoUserSeeds.filter(
      (u) => !DOMINIOS_DE_DEMO_PERMITIDOS.some((d) => u.email.endsWith(d))
    );

    expect(
      intrusas.map((u) => u.email),
      "una cuenta demo con dominio potencialmente real puede colisionar con una cuenta de " +
        `trabajo; usa uno de ${DOMINIOS_DE_DEMO_PERMITIDOS.join(", ")}`
    ).toEqual([]);
  });

  it("ninguna coincide con un correo administrativo real del proyecto", () => {
    const correosDemo = demoUserSeeds.map((u) => u.email.toLowerCase());
    const colisiones = CORREOS_ADMINISTRATIVOS_REALES.filter((real) =>
      correosDemo.includes(real.toLowerCase())
    );

    expect(
      colisiones,
      "la semilla reescribe password_hash: un correo compartido con una cuenta " +
        "administrativa real le impone la contraseña de demostración"
    ).toEqual([]);
  });

  it("mantiene una cuenta por rol pese a las cuentas retiradas", () => {
    // Los cuatro correos retirados solo duplicaban roles ya cubiertos. Si esta prueba
    // falla, la limpieza se llevó la única cuenta de algún rol y las pruebas de
    // integración que buscan un usuario por rol se quedarán sin sujeto.
    const rolesCubiertos = new Set(demoUserSeeds.map((u) => u.roleKey));

    for (const rol of roleSeeds) {
      expect(rolesCubiertos.has(rol.key), `ningún usuario demo tiene el rol ${rol.key}`).toBe(true);
    }
  });
});
