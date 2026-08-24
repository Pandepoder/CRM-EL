import type { Database } from "@tonala/shared/database";

export async function createInboxDependencies(db: Database) {
  const { InboxApplication } = await import("@tonala/modules/inbox/application");
  const { DrizzleInboxRepository } = await import("@tonala/modules/inbox/infrastructure");

  const repository = new DrizzleInboxRepository(db);
  const application = new InboxApplication(db);
  return { repository, application };
}
