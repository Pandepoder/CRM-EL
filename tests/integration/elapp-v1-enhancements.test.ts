import "dotenv/config";
import { describe, it, expect } from "vitest";
import { resolveUserNetworkScope } from "../../apps/web/src/lib/network-hierarchy.js";
import { getDatabaseClient } from "../../apps/web/src/lib/db-client.js";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("ElApp v1 Enhancements Integration Tests", () => {
  it("resolves global scope for coordinacion / admin users", async () => {
    // Admin demo user ID
    const adminId = "4178dcf3-a2b9-4d1f-a1db-bc3c6fd463ab";
    const scope = await resolveUserNetworkScope(adminId, "coordinacion");

    expect(scope.isGlobal).toBe(true);
    expect(scope.accessType).toBe("coordinacion");
    expect(scope.allowedUserIds).toBeNull();
  });

  it("resolves restricted network scope for conexion users", async () => {
    const randomId = crypto.randomUUID();
    const scope = await resolveUserNetworkScope(randomId, "conexion");

    expect(scope.isGlobal).toBe(false);
    expect(scope.accessType).toBe("conexion");
    expect(scope.allowedUserIds).toContain(randomId);
    expect(scope.allowedUserIds?.length).toBe(1);
  });

  it("persists and queries social listening reports", async () => {
    const db = getDatabaseClient();
    const adminId = "4178dcf3-a2b9-4d1f-a1db-bc3c6fd463ab";
    const reportId = crypto.randomUUID();

    const [inserted] = await db
      .insert(schema.socialListening)
      .values({
        id: reportId,
        title: "Test Social Listening Proposal",
        description: "Vecinos solicitan mejor iluminación",
        categories: ["propuesta"],
        status: "pendiente",
        isFormalGestion: 0,
        createdByUserId: adminId,
        createdAt: new Date()
      })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted?.id).toBe(reportId);
    expect(inserted?.title).toBe("Test Social Listening Proposal");

    // Clean up
    await db.delete(schema.socialListening).where(eq(schema.socialListening.id, reportId));
  });

  it("persists and queries rapid activity prospects", async () => {
    const db = getDatabaseClient();
    const adminId = "4178dcf3-a2b9-4d1f-a1db-bc3c6fd463ab";
    const prospectId = crypto.randomUUID();

    const [inserted] = await db
      .insert(schema.rapidActivityProspects)
      .values({
        id: prospectId,
        prospectName: "Dr. Roberto Mendoza",
        organizationOrReference: "Clínica Comunitaria",
        profileType: "social",
        disposition: "interesado",
        createdByUserId: adminId,
        createdAt: new Date()
      })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted?.id).toBe(prospectId);
    expect(inserted?.prospectName).toBe("Dr. Roberto Mendoza");

    // Clean up
    await db.delete(schema.rapidActivityProspects).where(eq(schema.rapidActivityProspects.id, prospectId));
  });

  it("persists immutable contact notes with author tracking", async () => {
    const db = getDatabaseClient();
    const adminId = "4178dcf3-a2b9-4d1f-a1db-bc3c6fd463ab";
    const contactId = crypto.randomUUID();
    const noteId = crypto.randomUUID();

    // Create temporary contact
    await db.insert(schema.contacts).values({
      id: contactId,
      displayName: "Contacto de Prueba Notas",
      status: "active",
      createdByUserId: adminId,
      createdAt: new Date(),
      version: 1
    });

    // Create note
    const [insertedNote] = await db
      .insert(schema.contactNotes)
      .values({
        id: noteId,
        contactId,
        authorUserId: adminId,
        noteText: "Nota de seguimiento fechada",
        createdAt: new Date()
      })
      .returning();

    expect(insertedNote).toBeDefined();
    expect(insertedNote?.id).toBe(noteId);
    expect(insertedNote?.noteText).toBe("Nota de seguimiento fechada");

    // Clean up
    await db.delete(schema.contactNotes).where(eq(schema.contactNotes.id, noteId));
    await db.delete(schema.contacts).where(eq(schema.contacts.id, contactId));
  });
});
