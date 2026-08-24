import type { Database } from "@tonala/shared/database";
import { InboxApplication } from "./application/index.js";
import { DrizzleInboxRepository } from "./infrastructure/drizzle-inbox.js";

export function createInboxModule(db: Database) {
  const repository = new DrizzleInboxRepository(db);
  const application = new InboxApplication(db);
  return { repository, application };
}

export * from "./contracts/index.js";
