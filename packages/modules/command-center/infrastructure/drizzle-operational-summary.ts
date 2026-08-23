import { sql } from "drizzle-orm";
import { type Database } from "@tonala/shared/database";

import type { OperationalSummary, OperationalSummaryReader } from "../contracts/operational-summary.js";

type SummaryRow = {
  total_contacts: string;
  total_users: string;
  visits_scheduled: string;
  visits_completed: string;
};

export class DrizzleOperationalSummaryReader implements OperationalSummaryReader {
  public constructor(private readonly db: Database) {}

  public async getSummary(): Promise<OperationalSummary> {
    const result = await this.db.execute<SummaryRow>(sql`
      SELECT
        (SELECT COUNT(id) FROM contacts WHERE status = 'active')::text AS total_contacts,
        (SELECT COUNT(id) FROM user_profiles WHERE status = 'active')::text AS total_users,
        (SELECT COUNT(id) FROM visits WHERE status = 'scheduled')::text AS visits_scheduled,
        (SELECT COUNT(id) FROM visits WHERE status = 'completed')::text AS visits_completed
    `);

    const row = result.rows[0];
    return {
      totalContacts: parseInt(row?.total_contacts ?? "0", 10),
      totalUsers: parseInt(row?.total_users ?? "0", 10),
      visitsScheduled: parseInt(row?.visits_scheduled ?? "0", 10),
      visitsCompleted: parseInt(row?.visits_completed ?? "0", 10)
    };
  }
}
