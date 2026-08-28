"use server";

import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { actorFromSession } from "@/lib/api-helpers";

export async function markAsProcessedAction(messageId: string) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) {
    return { error: "Unauthorized" };
  }

  try {
    const db = getDatabaseClient();
    await db.update(schema.inboxMessages)
      .set({ status: 'read' })
      .where(eq(schema.inboxMessages.id, messageId));

    revalidatePath("/admin-inbox");
    return { success: true };
  } catch (error) {
    console.error("markAsProcessedAction failed:", error);
    return { error: "Failed to process message" };
  }
}
