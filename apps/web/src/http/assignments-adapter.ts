import { z } from "zod";

import {
  assignResponsible,
  getContactAssignment,
  type AssignResponsibleDependencies,
  type GetContactAssignmentDependencies
} from "@tonala/modules/assignments/application";
import { toSafeHttpError } from "@tonala/shared/errors";

import { actorFromRequest, type HttpActorDependencies } from "./actor-provider.js";
import { parseJsonBody } from "./parse-body.js";

const assignResponsibleSchema = z.object({
  assignedUserId: z.string().uuid()
});

export type AssignmentsHttpDependencies =
  & AssignResponsibleDependencies
  & GetContactAssignmentDependencies
  & HttpActorDependencies;

export async function handleAssignmentsRequest(
  request: Request,
  dependencies: AssignmentsHttpDependencies
): Promise<Response> {
  try {
    const actor = actorFromRequest(request, dependencies);
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/contacts\/(?<contactId>[^/]+)\/assignment$/);
    if (!match?.groups?.contactId) {
      return Response.json({ code: "route_not_found", message: "Route was not found." }, { status: 404 });
    }

    const contactId = match.groups.contactId;
    if (request.method === "PUT") {
      const body = await parseJsonBody(request, assignResponsibleSchema);
      const result = await assignResponsible(actor, { contactId, assignedUserId: body.assignedUserId }, dependencies);
      if (!result.ok) return jsonError(result.error);
      return Response.json(result.value, { status: 200 });
    }

    if (request.method === "GET") {
      const result = await getContactAssignment(actor, { contactId }, dependencies);
      if (!result.ok) return jsonError(result.error);
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
