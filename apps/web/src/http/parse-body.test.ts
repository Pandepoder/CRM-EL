import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

import { parseJsonBody } from "./parse-body.js";

const schema = z.object({ displayName: z.string() });

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/contacts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("parseJsonBody", () => {
  it("returns the parsed body when it matches the schema", async () => {
    const result = await parseJsonBody(jsonRequest({ displayName: "Ada" }), schema);
    expect(result).toEqual({ displayName: "Ada" });
  });

  it("throws a Validation ApplicationError when the body fails schema validation", async () => {
    await expect(parseJsonBody(jsonRequest({ displayName: 42 }), schema)).rejects.toMatchObject({
      code: "invalid_request_body",
      category: ErrorCategory.Validation
    });
  });

  it("throws a Validation ApplicationError when the body is not valid JSON", async () => {
    const malformedRequest = () =>
      new Request("http://localhost/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json"
      });

    await expect(parseJsonBody(malformedRequest(), schema)).rejects.toBeInstanceOf(ApplicationError);
    await expect(parseJsonBody(malformedRequest(), schema)).rejects.toMatchObject({
      code: "invalid_json_body",
      category: ErrorCategory.Validation
    });
  });
});
