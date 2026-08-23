import { type Database } from "@tonala/shared/database";

import { DrizzleOperationalSummaryReader } from "./drizzle-operational-summary.js";

export function createOperationalSummaryReader(db: Database) {
  return new DrizzleOperationalSummaryReader(db);
}
