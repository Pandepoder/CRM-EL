import { describe, expect, it } from "vitest";

import {
  ApplicationError,
  DomainError,
  ErrorCategory,
  InfrastructureError,
  type TonalaOsError
} from "@tonala/shared/errors";
import { err, ok } from "@tonala/shared/kernel";

import { resultToResponse } from "./api-helpers.js";

/**
 * `resultToResponse` traducía el Result de un caso de uso a HTTP con un mapa escrito a mano
 * que solo conocía cuatro de las ocho categorías de error; el resto caía en 500.
 *
 * El defecto se vio en campo así: dar de alta un ciudadano sin nombre respondía
 * `500 {"code":"contact_display_name_required"}`. El código y el mensaje eran correctos, el
 * estado no. Para el cliente, un 500 y un dato inválido son cosas distintas —uno se reintenta,
 * el otro se corrige—, así que ni el mensaje ni la cola de reintento podían comportarse bien.
 *
 * Estas pruebas fijan que el estado salga del mapa del kernel (`toSafeHttpError`) y no de una
 * copia local, que es lo que se desincronizó.
 */
describe("resultToResponse", () => {
  const estadoDe = async (error: TonalaOsError) => {
    const respuesta = resultToResponse(err(error));
    return { status: respuesta.status, cuerpo: await respuesta.json() };
  };

  it("traduce un error de dominio a 422 y no a 500", async () => {
    const { status, cuerpo } = await estadoDe(
      new DomainError({
        code: "contact_display_name_required",
        message: "Contact displayName is required.",
        publicMessage: "Contact name is required."
      })
    );

    expect(status).toBe(422);
    expect(cuerpo).toEqual({
      code: "contact_display_name_required",
      message: "Contact name is required."
    });
  });

  it("traduce un error de infraestructura a 503 y no a 500", async () => {
    const { status } = await estadoDe(
      new InfrastructureError({ code: "db_down", message: "Connection refused" })
    );

    expect(status).toBe(503);
  });

  it("traduce un conflicto a 409 y no a 500", async () => {
    const { status } = await estadoDe(
      new ApplicationError({
        code: "already_exists",
        category: ErrorCategory.Conflict,
        message: "Duplicate"
      })
    );

    expect(status).toBe(409);
  });

  it.each([
    [ErrorCategory.Validation, 400],
    [ErrorCategory.Unauthorized, 401],
    [ErrorCategory.Forbidden, 403],
    [ErrorCategory.NotFound, 404]
  ])("conserva el estado de %s", async (categoria, esperado) => {
    const { status } = await estadoDe(
      new ApplicationError({ code: "x", category: categoria, message: "x" })
    );

    expect(status).toBe(esperado);
  });

  it("no filtra el mensaje interno: publica solo el público", async () => {
    const { cuerpo } = await estadoDe(
      new ApplicationError({
        code: "interno",
        category: ErrorCategory.Validation,
        message: "select * from user_profiles where secret = 1",
        publicMessage: "Revisa los datos."
      })
    );

    expect(cuerpo).toEqual({ code: "interno", message: "Revisa los datos." });
  });

  it("devuelve el valor tal cual cuando el resultado es correcto", async () => {
    const respuesta = resultToResponse(ok({ contactId: "abc" }));

    expect(respuesta.status).toBe(200);
    await expect(respuesta.json()).resolves.toEqual({ contactId: "abc" });
  });
});
