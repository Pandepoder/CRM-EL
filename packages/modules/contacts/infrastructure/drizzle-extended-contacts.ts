import { sql } from "drizzle-orm";

import { type ExtendedContactInput, type ExtendedContactRepository } from "../application/register-extended-contact.js";
import {
  type TransactionContext
} from "../application/ports.js";
import { type Contact } from "../domain/index.js";

type DrizzleExecutor = {
  execute(query: ReturnType<typeof sql>): Promise<unknown>;
};

function executorFrom(tx: TransactionContext): DrizzleExecutor {
  const candidate = tx as { client?: DrizzleExecutor };
  if (!candidate.client) {
    throw new Error("Transaction context does not contain a Drizzle executor");
  }
  return candidate.client;
}

export class DrizzleExtendedContactRepository implements ExtendedContactRepository {
  public async insertExtended(
    contact: Contact,
    extended: ExtendedContactInput,
    tx: TransactionContext
  ): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO contacts (
        id, display_name, first_name, last_name, maternal_last_name,
        referred_by_user_id, birth_date, phone, email, address, address_number,
        colony, profession, company_or_work, years_known, skill, availability,
        interests, past_support, status, created_by_user_id, created_at, version
      )
      VALUES (
        ${contact.contactId},
        ${contact.displayName},
        ${extended.firstName ?? null},
        ${extended.lastName ?? null},
        ${extended.maternalLastName ?? null},
        ${extended.referredByUserId ?? null},
        ${extended.birthDate?.toISOString() ?? null},
        ${extended.phone ?? null},
        ${extended.email ?? null},
        ${extended.address ?? null},
        ${extended.addressNumber ?? null},
        ${extended.colony ?? null},
        ${extended.profession ?? null},
        ${extended.companyOrWork ?? null},
        ${extended.yearsKnown ?? null},
        ${extended.skill ?? null},
        ${extended.availability ?? null},
        ${extended.interests ?? null},
        ${extended.pastSupport ?? null},
        ${contact.status},
        ${contact.createdByUserId},
        ${contact.createdAt.toISOString()},
        ${contact.version}
      )
    `);
  }
}
