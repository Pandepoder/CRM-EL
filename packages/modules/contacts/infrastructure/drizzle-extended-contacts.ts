import { sql } from "drizzle-orm";
import { encryptData, huellaDeTelefono } from "@tonala/shared/database";

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
    const ejecutor = executorFrom(tx);
    await ejecutor.execute(sql`
      INSERT INTO contacts (
        id, display_name, first_name, last_name, maternal_last_name,
        referred_by_user_id, birth_date, birth_year_known, phone, phone_hash, email, address, address_number,
        colony, municipality, section_id, profession, company_or_work, years_known, skill, availability,
        interests, past_support, status, created_by_user_id, created_at, version,
        origin, actual_contact_user_id, first_contact_date, preferred_contact_method, preferred_contact_time,
        pan_militancy, pan_militancy_verified_at, know_me_better, barda_photo_url, exact_latitude, exact_longitude,
        client_request_id, municipality_id
      )
      VALUES (
        ${contact.contactId},
        ${contact.displayName},
        ${encryptData(extended.firstName ?? null)},
        ${encryptData(extended.lastName ?? null)},
        ${encryptData(extended.maternalLastName ?? null)},
        ${extended.referredByUserId ?? null},
        ${extended.birthDate?.toISOString() ?? null},
        ${extended.birthYearKnown ?? true},
        ${encryptData(extended.phone ?? contact.phoneNumber ?? null)},
        ${huellaDeTelefono(extended.phone ?? contact.phoneNumber)},
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
        ${contact.version},
        ${extended.origin ?? "toca_toca"},
        ${extended.actualContactUserId ?? null},
        ${extended.firstContactDate?.toISOString() ?? null},
        ${extended.preferredContactMethod ?? null},
        ${extended.preferredContactTime ?? null},
        ${extended.panMilitancy ?? "no_registrada"},
        ${extended.panMilitancyVerifiedAt?.toISOString() ?? null},
        ${encryptData(extended.knowMeBetter ?? null)},
        ${extended.bardaPhotoUrl ?? null},
        ${extended.exactLatitude ?? null},
        ${extended.exactLongitude ?? null},
        ${extended.clientRequestId ?? null},
        -- La llave del municipio elegido. Si no hay (o no es del catálogo), la pone la base: la de su
        -- sección, que además manda siempre, o la de quien lo registra (migración 0022).
        (SELECT id FROM municipalities WHERE name = ${extended.municipality ?? null} AND kind = 'municipio')
      )
    `);

    // En la misma transacción que el alta: un ciudadano nunca queda sin la nota o la encuesta que se
    // capturaron con él.
    const nota = extended.initialNote?.trim();
    if (nota) {
      await ejecutor.execute(sql`
        INSERT INTO contact_notes (contact_id, author_user_id, note_text, created_at)
        VALUES (${contact.contactId}, ${contact.createdByUserId}, ${encryptData(nota)}, ${contact.createdAt.toISOString()})
      `);
    }

    const s = extended.survey;
    if (s) {
      await ejecutor.execute(sql`
        INSERT INTO social_surveys (
          contact_id, colony_priority_need, colony_priority_other, tonala_values, tonala_values_other,
          services_rating, services_rating_why, project_expectations, project_expectations_other,
          participation_form, participation_form_other, open_proposal, created_at
        )
        VALUES (
          ${contact.contactId}, ${s.colonyPriorityNeed ?? null}, ${s.colonyPriorityOther ?? null},
          ${s.tonalaValues ?? null}, ${s.tonalaValuesOther ?? null}, ${s.servicesRating ?? null},
          ${s.servicesRatingWhy ?? null}, ${s.projectExpectations ?? null}, ${s.projectExpectationsOther ?? null},
          ${s.participationForm ?? null}, ${s.participationFormOther ?? null}, ${s.openProposal ?? null},
          ${contact.createdAt.toISOString()}
        )
      `);
    }
  }
}
