import type { Database } from "@tonala/shared/database";

export async function createLogisticsDependencies(db: Database) {
  const { LogisticsApplication } = await import("@tonala/modules/logistics/application");
  const { DrizzleLogisticsRepository } = await import("@tonala/modules/logistics/infrastructure");
  
  const repository = new DrizzleLogisticsRepository(db);
  const application = new LogisticsApplication(db);
  return { repository, application };
}
