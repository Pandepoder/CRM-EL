import { z } from "zod";

import {
  getContactTerritory,
  linkContactToColony,
  type GetContactTerritoryDependencies,
  type LinkContactToColonyDependencies
} from "@tonala/modules/territory/application";
import { toSafeHttpError } from "@tonala/shared/errors";

import { actorFromRequest, type HttpActorDependencies } from "./actor-provider.js";
import { parseJsonBody } from "./parse-body.js";

const linkContactToColonySchema = z.object({
  colonyId: z.string().uuid()
});

export type TerritoryHttpDependencies =
  & LinkContactToColonyDependencies
  & GetContactTerritoryDependencies
  & HttpActorDependencies;

export async function handleTerritoryRequest(
  request: Request,
  dependencies: TerritoryHttpDependencies
): Promise<Response> {
  try {
    const actor = actorFromRequest(request, dependencies);
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/contacts\/(?<contactId>[^/]+)\/territory$/);

    if (!match?.groups?.contactId) {
      return Response.json({ code: "route_not_found", message: "Route was not found." }, { status: 404 });
    }

    const contactId = match.groups.contactId;

    if (request.method === "PUT") {
      const body = await parseJsonBody(request, linkContactToColonySchema);
      const result = await linkContactToColony(actor, { contactId, colonyId: body.colonyId }, dependencies);
      if (!result.ok) {
        return jsonError(result.error);
      }
      // PUT is idempotent: linking (first time or relinking to a different
      // colony) and a no-op re-link to the same colony both report 200.
      // If "created vs updated" ever needs to be distinguished (e.g. 201 on
      // first link), LinkContactToColonyResult needs an explicit `created`
      // field — `changed`/`idempotent` alone don't carry that information.
      return Response.json(result.value, { status: 200 });
    }

    if (request.method === "GET") {
      const result = await getContactTerritory(actor, { contactId }, dependencies);
      if (!result.ok) {
        return jsonError(result.error);
      }
      return Response.json(result.value, { status: 200 });
    }

    return Response.json({ code: "route_not_found", message: "Route was not found." }, { status: 404 });
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown): Response {
  const safe = toSafeHttpError(error);
  return Response.json({ code: safe.code, message: safe.message }, { status: safe.status });
}
