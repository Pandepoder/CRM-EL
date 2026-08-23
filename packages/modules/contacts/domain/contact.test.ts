import { describe, expect, it } from "vitest";

import { createDisplayName, createMinimalContact, displayNameMaxLength } from "./index.js";

describe("contact domain", () => {
  it("normalizes displayName spaces", () => {
    expect(createDisplayName("  Maria   Lopez  ")).toBe("Maria Lopez");
  });

  it("rejects empty displayName", () => {
    expect(() => createDisplayName("   ")).toThrow(/displayName is required/);
  });

  it("rejects displayName above max length", () => {
    expect(() => createDisplayName("A".repeat(displayNameMaxLength + 1))).toThrow(/exceeds/);
  });

  it("creates active contacts with version 1", () => {
    const contact = createMinimalContact({
      contactId: "00000000-0000-0000-0000-000000000101" as never,
      displayName: "Maria Lopez",
      createdByUserId: "00000000-0000-0000-0000-000000000001" as never,
      createdAt: new Date("2026-07-28T00:00:00.000Z")
    });

    expect(contact.status).toBe("active");
    expect(contact.version).toBe(1);
  });
});
