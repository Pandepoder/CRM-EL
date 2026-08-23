import type { z } from "zod";

import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

/**
 * Reads and validates the JSON body of a request against a Zod schema.
 *
 * Both a malformed JSON payload and a schema validation failure are
 * converted into an ApplicationError(Validation), which toSafeHttpError
 * maps to HTTP 400. Without this, `schema.parse(await request.json())`
 * throws a raw ZodError/SyntaxError that toSafeHttpError does not
 * recognize, and the adapter falls back to a generic 500.
 */
export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApplicationError({
      code: "invalid_json_body",
      category: ErrorCategory.Validation,
      message: "Request body is not valid JSON.",
      publicMessage: "Request body must be valid JSON."
    });
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApplicationError({
      code: "invalid_request_body",
      category: ErrorCategory.Validation,
      message: `Request body failed validation: ${result.error.message}`,
      publicMessage: "Request body is invalid.",
      diagnostic: {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      }
    });
  }

  return result.data;
}
