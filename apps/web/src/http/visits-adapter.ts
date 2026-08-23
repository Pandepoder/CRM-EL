import { z } from "zod";

import {
  completeVisit,
  getVisitById,
  scheduleVisit,
  type CompleteVisitDependencies,
  type GetVisitByIdDependencies,
  type ScheduleVisitDependencies
} from "@tonala/modules/visits/application";
import { toSafeHttpError } from "@tonala/shared/errors";

import { actorFromRequest, type HttpActorDependencies } from "./actor-provider.js";
import { parseJsonBody } from "./parse-body.js";

const scheduleVisitSchema = z.object({
  contactId: z.string().uuid(),
  scheduledAt: z.string(),
  visitLocationText: z.string()
});

const completeVisitSchema = z.object({
  structuredOutcome: z.enum(["successful", "no_contact", "follow_up_required", "rejected"]),
  summary: z.string()
});

export type VisitsHttpDependencies =
  & ScheduleVisitDependencies
  & GetVisitByIdDependencies
  & CompleteVisitDependencies
  & HttpActorDependencies;

export async function handleVisitsRequest(
  request: Request,
  dependencies: VisitsHttpDependencies
): Promise<Response> {
  try {
    const actor = actorFromRequest(request, dependencies);
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/visits") {
      const body = await parseJsonBody(request, scheduleVisitSchema);
      const result = await scheduleVisit(actor, body, dependencies);
      if (!result.ok) return jsonError(result.error);
      return Response.json(result.value, { status: 201 });
    }

    const completeMatch = url.pathname.match(/^\/api\/visits\/(?<visitId>[^/]+)\/complete$/);
    if (request.method === "POST" && completeMatch?.groups?.visitId) {
      const body = await parseJsonBody(request, completeVisitSchema);
      const result = await completeVisit(actor, { visitId: completeMatch.groups.visitId, ...body }, dependencies);
      if (!result.ok) return jsonError(result.error);
      return Response.json(result.value, { status: 200 });
    }

    const getMatch = url.pathname.match(/^\/api\/visits\/(?<visitId>[^/]+)$/);
    if (request.method === "GET" && getMatch?.groups?.visitId) {
      const result = await getVisitById(actor, { visitId: getMatch.groups.visitId }, dependencies);
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
