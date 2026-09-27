import { inspect } from "node:util";

import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";

import { esUuid } from "./ids.js";
import { protegerConsola, sinValoresDeConsulta, sinValoresDePostgres } from "./registro.js";
import { safeErrorMessage } from "./safe-error.js";

/**
 * Qué sale de un error de la base hacia el cliente y hacia el registro.
 *
 * Los errores se construyen con la clase real de Drizzle, que es lo que llega a las rutas: el
 * mensaje `Failed query: <sql>\nparams: <valores>` con el SQL en minúsculas, y el error de `pg` en
 * `cause`. Las consultas y los textos de `pg` son los que se vieron en la aplicación corriendo.
 */

function errorDePg(mensaje: string, code: string): Error {
  return Object.assign(new Error(mensaje), { code });
}

const UUID_INVALIDO = new DrizzleQueryError(
  'select "id" from "contacts" where "contacts"."id" = $1',
  ["no-es-uuid"],
  errorDePg('invalid input syntax for type uuid: "no-es-uuid"', "22P02")
);

describe("safeErrorMessage", () => {
  it("no devuelve un error corto de Drizzle con su consulta y sus valores", () => {
    // Mide 87 caracteres, por debajo del límite de 120 que dejaba pasar un mensaje «corto».
    expect(UUID_INVALIDO.message.length).toBeLessThan(120);
    expect(safeErrorMessage(UUID_INVALIDO, "genérico")).toBe("genérico");
  });

  it("reconoce el SQL en minúsculas aunque no venga de Drizzle", () => {
    expect(safeErrorMessage(new Error('update "teams" set "name" = $1'), "genérico")).toBe("genérico");
    expect(safeErrorMessage(new Error('delete from "visits" where x'), "genérico")).toBe("genérico");
  });

  it("detrás de Drizzle reconoce un duplicado por el código de pg", () => {
    const duplicado = new DrizzleQueryError(
      'insert into "user_profiles" ("email") values ($1)',
      ["alguien@ejemplo.mx"],
      errorDePg('duplicate key value violates unique constraint "user_profiles_email_unique"', "23505")
    );
    expect(safeErrorMessage(duplicado)).toBe("Este registro ya existe en el sistema.");
  });

  it("detrás de Drizzle reconoce la base caída", () => {
    const caida = new DrizzleQueryError("select 1", [], errorDePg("", "ECONNREFUSED"));
    expect(safeErrorMessage(caida)).toBe("Error de conexión con la base de datos. Intente más tarde.");
  });

  it("detrás de Drizzle reconoce una restricción CHECK", () => {
    const check = new DrizzleQueryError(
      'insert into "x" ("y") values ($1)',
      ["z"],
      errorDePg('new row for relation "x" violates check constraint "x_y_check"', "23514")
    );
    expect(safeErrorMessage(check)).toBe("Los datos proporcionados no cumplen con las validaciones del sistema.");
  });

  it("sigue dejando pasar los mensajes cortos pensados para el usuario", () => {
    const motivo = "Solo administración o el líder de este equipo pueden gestionar sus integrantes";
    expect(safeErrorMessage(new Error(motivo), "genérico")).toBe(motivo);
    expect(safeErrorMessage(new Error("No autenticado"), "genérico")).toBe("No autenticado");
  });

  it("sigue ocultando rutas internas y mensajes largos", () => {
    expect(safeErrorMessage(new Error("ENOENT: /app/public/uploads/x.jpg"), "genérico")).toBe("genérico");
    expect(safeErrorMessage(new Error("x".repeat(200)), "genérico")).toBe("genérico");
    expect(safeErrorMessage("no es un Error", "genérico")).toBe("genérico");
  });
});

describe("sinValoresDeConsulta (registro del servidor)", () => {
  const NOMBRE = "Zz Persona Inventada";
  const alta = new DrizzleQueryError(
    'insert into "contacts" ("id", "display_name") values ($1, $2)',
    ["7f3c0000-0000-4000-8000-000000000000", NOMBRE],
    errorDePg("insert or update on table \"contacts\" violates foreign key constraint", "23503")
  );

  it("quita los valores del mensaje y conserva la consulta", () => {
    const limpio = sinValoresDeConsulta(alta.message);
    expect(limpio).not.toContain(NOMBRE);
    expect(limpio).toContain('insert into "contacts"');
    expect(limpio).toContain("params: [omitidos]");
  });

  it("quita los valores de la traza y conserva los marcos", () => {
    expect(alta.stack).toContain(NOMBRE);
    const limpia = sinValoresDeConsulta(alta.stack ?? "");
    expect(limpia).not.toContain(NOMBRE);
    expect(limpia).toMatch(/\n {4}at /);
  });

  it("quita también valores con saltos de línea, como el texto de una nota", () => {
    const nota = new DrizzleQueryError('insert into "contact_notes" ("note_text") values ($1)', [
      "Primera línea con dato\nSegunda línea con teléfono 3312345678"
    ]);
    expect(sinValoresDeConsulta(nota.message)).not.toContain("3312345678");
    expect(sinValoresDeConsulta(nota.stack ?? "")).not.toContain("3312345678");
  });

  it("no toca un texto sin valores", () => {
    expect(sinValoresDeConsulta("connect ECONNREFUSED 127.0.0.1:5432")).toBe("connect ECONNREFUSED 127.0.0.1:5432");
  });
});

describe("sinValoresDePostgres", () => {
  it("quita el valor citado al final del mensaje", () => {
    expect(sinValoresDePostgres('invalid input syntax for type uuid: "Juan Pérez"')).toBe("invalid input syntax for type uuid: [omitido]");
    expect(sinValoresDePostgres('date/time field value out of range: "31/02/1990"\n    at x')).toBe("date/time field value out of range: [omitido]\n    at x");
  });

  it("conserva los nombres de tabla, columna y restricción", () => {
    const fk = 'insert or update on table "contacts" violates foreign key constraint "contacts_created_by_user_id_fk"';
    expect(sinValoresDePostgres(fk)).toBe(fk);
    const nulo = 'null value in column "display_name" of relation "contacts" violates not-null constraint';
    expect(sinValoresDePostgres(nulo)).toBe(nulo);
    const consulta = 'Failed query: select "id" from "contacts" where "contacts"."id" = $1';
    expect(sinValoresDePostgres(consulta)).toBe(consulta);
  });
});

describe("protegerConsola (errores que imprime Next por su cuenta)", () => {
  const NOMBRE = "Zz Persona Inventada";
  const fallo = () =>
    Object.assign(
      new DrizzleQueryError('insert into "contacts" ("display_name") values ($1)', [NOMBRE], errorDePg("x", "23503")),
      { digest: "2919335574" }
    );

  function consolaDePrueba() {
    const escrito: unknown[][] = [];
    const consola = { error: (...a: unknown[]) => escrito.push(a), warn: (...a: unknown[]) => escrito.push(a) };
    protegerConsola(consola);
    return { consola, escrito };
  }

  it("lo que llega a la consola no trae los valores, ni en el mensaje, ni en la traza, ni en `params`", () => {
    const { consola, escrito } = consolaDePrueba();
    // Así lo imprime Next: un prefijo y el error.
    consola.error(" ⨯", fallo());
    const [prefijo, impreso] = escrito[0] as [string, Error & { digest?: string; params?: unknown }];
    expect(prefijo).toBe(" ⨯");
    expect(impreso.message).not.toContain(NOMBRE);
    expect(impreso.stack).not.toContain(NOMBRE);
    expect(impreso.params).toBeUndefined();
    expect(inspect(impreso, { depth: 5 })).not.toContain(NOMBRE);
  });

  it("conserva la consulta, el digest que ve el usuario y la causa de Postgres", () => {
    const { consola, escrito } = consolaDePrueba();
    consola.error(fallo());
    const impreso = escrito[0]?.[0] as Error & { digest?: string };
    expect(impreso.message).toContain('insert into "contacts"');
    expect(impreso.digest).toBe("2919335574");
    expect((impreso.cause as { code?: string }).code).toBe("23503");
  });

  it("limpia también un texto suelto y en `warn`", () => {
    const { consola, escrito } = consolaDePrueba();
    consola.warn(`Failed query: select 1\nparams: ${NOMBRE}`);
    expect(String(escrito[0]?.[0])).not.toContain(NOMBRE);
  });

  it("no toca lo demás y no se envuelve dos veces", () => {
    const { consola, escrito } = consolaDePrueba();
    protegerConsola(consola);
    const otro = new Error("sin consulta");
    consola.error("texto normal", otro, 42);
    expect(escrito).toHaveLength(1);
    expect(escrito[0]).toEqual(["texto normal", otro, 42]);
    expect(escrito[0]?.[1]).toBe(otro);
  });

  it("quita el valor que Postgres repite en su mensaje y el `detail` de un duplicado", () => {
    const { consola, escrito } = consolaDePrueba();
    // Tal cual los arma `pg`: con `severity` y, en un duplicado, el valor en `detail`.
    const tipo = Object.assign(new Error(`invalid input syntax for type uuid: "${NOMBRE}"`), { code: "22P02", severity: "ERROR" });
    const duplicado = Object.assign(new Error('duplicate key value violates unique constraint "user_profiles_email_unique"'), {
      code: "23505",
      severity: "ERROR",
      constraint: "user_profiles_email_unique",
      detail: "Key (email)=(zz.persona@ejemplo.mx) already exists."
    });
    consola.error(new DrizzleQueryError('select "id" from "user_profiles" where "id" = $1', [NOMBRE], tipo));
    consola.error(" ⨯", new DrizzleQueryError('insert into "user_profiles" ("email") values ($1)', ["zz.persona@ejemplo.mx"], duplicado));
    const todo = escrito.map((a) => a.map((x) => inspect(x, { depth: 6 })).join(" ")).join("\n");
    expect(todo).not.toContain(NOMBRE);
    expect(todo).not.toContain("zz.persona@ejemplo.mx");
    // Lo que sirve para saber qué pasó se queda.
    expect(todo).toContain("invalid input syntax for type uuid: [omitido]");
    expect(todo).toContain("user_profiles_email_unique");
    expect(todo).toContain("23505");
  });

  it("el error original no se modifica: Next lo sigue necesitando entero", () => {
    const { consola } = consolaDePrueba();
    const original = fallo();
    consola.error(original);
    expect(original.message).toContain(NOMBRE);
  });
});

describe("esUuid", () => {
  it("acepta un UUID en minúsculas o mayúsculas", () => {
    expect(esUuid("7f3c1a2b-0000-4000-8000-00000000abcd")).toBe(true);
    expect(esUuid("7F3C1A2B-0000-4000-8000-00000000ABCD")).toBe(true);
  });

  it("rechaza lo demás", () => {
    for (const valor of ["no-es-uuid", "", "7f3c1a2b-0000-4000-8000-00000000abc", "7f3c1a2b00004000800000000000abcd", " 7f3c1a2b-0000-4000-8000-00000000abcd", null, undefined, 42]) {
      expect(esUuid(valor)).toBe(false);
    }
  });
});
