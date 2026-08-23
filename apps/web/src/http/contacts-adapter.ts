import { z } from "zod";

import {
  getContactById,
  registerMinimalContact,
  type GetContactByIdDependencies,
  type RegisterMinimalContactDependencies
} from "@tonala/modules/contacts/application";
import { toSafeHttpError } from "@tonala/shared/errors";

import { actorFromRequest, type HttpActorDependencies } from "./actor-provider.js";
import { parseJsonBody } from "./parse-body.js";

const createContactSchema = z.object({
  displayName: z.string()
});

export type ContactsHttpDependencies =
  & RegisterMinimalContactDependencies
  & GetContactByIdDependencies
  & HttpActorDependencies;

export async function handleContactsRequest(
  request: Request,
  dependencies: ContactsHttpDependencies
): Promise<Response> {
  try {
    const actor = actorFromRequest(request, dependencies);
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/contacts") {
      const body = await parseJsonBody(request, createContactSchema);
      const result = await registerMinimalContact(actor, body, dependencies);
      if (!result.ok) {
        return jsonError(result.error);
      }
      return Response.json(result.value, { status: 201 });
    }

    if (request.method === "GET" && /^\/api\/contacts\/[^/]+$/.test(url.pathname)) {
      const contactId = url.pathname.replace("/api/contacts/", "");
      const result = await getContactById(actor, { contactId }, dependencies);
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
