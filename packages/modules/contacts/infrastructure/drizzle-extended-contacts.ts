import { sql } from "drizzle-orm";
import { encryptData } from "@tonala/shared/database";

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
        colony, municipality, section_id, profession, company_or_work, years_known, skill, availability,
        interests, past_support, status, created_by_user_id, created_at, version
      )
      VALUES (
        ${contact.contactId},
        ${contact.displayName},
        ${encryptData(extended.firstName ?? null)},
        ${encryptData(extended.lastName ?? null)},
        ${encryptData(extended.maternalLastName ?? null)},
        ${extended.referredByUserId ?? null},
        ${extended.birthDate?.toISOString() ?? null},
        ${encryptData(extended.phone ?? contact.phoneNumber ?? null)},
        ${encryptData(extended.email ?? null)},
        ${encryptData(extended.address ?? null)},
        ${encryptData(extended.addressNumber ?? null)},
        ${encryptData(extended.colony ?? null)},
        ${encryptData(extended.municipality ?? null)},
        ${extended.sectionId ?? null},
        ${encryptData(extended.profession ?? null)},
        ${encryptData(extended.companyOrWork ?? null)},
        ${extended.yearsKnown ?? null},
        ${encryptData(extended.skill ?? null)},
        ${encryptData(extended.availability ?? null)},
        ${encryptData(extended.interests ?? null)},
        ${encryptData(extended.pastSupport ?? null)},
        ${contact.status},
        ${contact.createdByUserId},
        ${contact.createdAt.toISOString()},
        ${contact.version}
      )
    `);
  }
}
