import type { Database } from "@tonala/shared/database";
import { LogisticsApplication } from "./application/index.js";
import { DrizzleLogisticsRepository } from "./infrastructure/drizzle-logistics.js";

export function createLogisticsModule(db: Database) {
  const repository = new DrizzleLogisticsRepository(db);
  const application = new LogisticsApplication(db);
  return { repository, application };
}

export * from "./contracts/index.js";
