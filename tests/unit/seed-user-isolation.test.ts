import { describe, expect, it } from "vitest";

import { roleSeeds, userSeeds } from "../../scripts/db/seed-data.js";

/**
 * Aislamiento de los usuarios que crea la semilla frente a las cuentas de trabajo.
 *
 * Existe por un defecto concreto: `userSeeds` llegó a incluir `admin@tonala.gob.mx` y
 * `admin@elapp.com.mx`, que no son correos ficticios sino los valores por omisión de
 * `ADMIN_EMAIL` en `.env.example`, en `docker-compose.yml` y en el `.env` que
 * `scripts/deploy-vps.py` escribe en el servidor. Como la semilla hace
 * `ON CONFLICT (email) DO UPDATE SET password_hash`, sembrar sobre una base real le
 * cambiaba la contraseña al administrador de producción.
 *
 * El riesgo no se arregla de una vez: vuelve en cuanto alguien añada un usuario de prueba
 * con un correo que parezca institucional. De ahí que sea una prueba y no un comentario.
 */

/** `.local` está reservado por RFC 6762 y no puede resolver a un dominio real. */
const DOMINIOS_RESERVADOS = [".local", ".invalid", ".test", ".example"];

/**
 * Correos que alguna configuración del proyecto usa como cuenta administrativa real.
 * Ningún usuario sembrado puede coincidir con estos.
 */
const CORREOS_ADMINISTRATIVOS_REALES = [
  "admin@tonala.gob.mx", // .env.example y el Administrador Maestro de clean-production.ts
  "admin@elapp.com.mx"   // deploy-vps.py: el admin del servidor
];

describe("aislamiento de los usuarios sembrados", () => {
  it("todos usan un dominio reservado que no puede ser real", () => {
    const intrusos = userSeeds.filter(
      (u) => !DOMINIOS_RESERVADOS.some((d) => u.email.endsWith(d))
    );

    expect(
      intrusos.map((u) => u.email),
      "un usuario de prueba con dominio potencialmente real puede colisionar con una cuenta " +
        `de trabajo; usa uno de ${DOMINIOS_RESERVADOS.join(", ")}`
    ).toEqual([]);
  });

  it("ninguno coincide con un correo administrativo real del proyecto", () => {
    const correosSembrados = userSeeds.map((u) => u.email.toLowerCase());
    const colisiones = CORREOS_ADMINISTRATIVOS_REALES.filter((real) =>
      correosSembrados.includes(real.toLowerCase())
    );

    expect(
      colisiones,
      "la semilla reescribe password_hash: un correo compartido con una cuenta " +
        "administrativa real le impone la contraseña de los fixtures"
    ).toEqual([]);
  });

  it("cubre todos los roles", () => {
    // Las pruebas de integración buscan un usuario por rol. Si esta falla, alguna limpieza
    // se llevó el único usuario de un rol y esas pruebas se quedan sin sujeto.
    const rolesCubiertos = new Set(userSeeds.map((u) => u.roleKey));

    for (const rol of roleSeeds) {
      expect(rolesCubiertos.has(rol.key), `ningún usuario sembrado tiene el rol ${rol.key}`).toBe(
        true
      );
    }
  });
});
