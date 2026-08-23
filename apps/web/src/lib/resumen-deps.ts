import { type Database } from "@tonala/shared/database";

export async function createResumenDependencies(db: Database) {
  const { createOperationalSummaryReader } = await import("@tonala/modules/command-center/infrastructure");
  
  return {
    summaryReader: createOperationalSummaryReader(db)
  };
}
