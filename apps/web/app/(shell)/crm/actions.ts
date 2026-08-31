"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registerExtendedContact } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { actorFromSession, permissionChecker } from "@/lib/api-helpers";
import { assertActorPermission, Permission } from "@/lib/authorization";
import {
  createExtendedContactsMutationsDependencies
} from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { processOutboxInline } from "@/lib/outbox";

export async function createContactAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor) throw new Error("Unauthorized");
  assertActorPermission(actor, Permission.ContactsCreate);

  const firstName = ((formData.get("firstName") as string) || "").trim();
  const lastName = ((formData.get("lastName") as string) || "").trim();
  const maternalLastName = ((formData.get("maternalLastName") as string) || "").trim();
  const displayName = `${firstName} ${lastName} ${maternalLastName}`.trim();

  if (!displayName) throw new Error("Nombre es requerido");

  const birthDay = formData.get("birthDay") as string;
  const birthMonth = formData.get("birthMonth") as string;
  const birthYear = formData.get("birthYear") as string;
  let birthDate: Date | null = null;
  if (birthDay && birthMonth) {
    const yr = birthYear ? parseInt(birthYear, 10) : 2000;
    birthDate = new Date(Date.UTC(yr, parseInt(birthMonth, 10) - 1, parseInt(birthDay, 10)));
  } else {
    const rawBirthDate = formData.get("birthDate") as string;
    if (rawBirthDate) birthDate = new Date(rawBirthDate);
  }

  const db = getDatabaseClient();

  const colony = ((formData.get("colony") as string) || "").trim() || "Por identificar";
  const municipality = ((formData.get("municipality") as string) || "Tonalá").trim();
  const sectionNumStr = (formData.get("sectionNum") as string) || "";
  let sectionId = ((formData.get("sectionId") as string) || "").trim() || null;

  // Resolve section number or create on the fly
  const sectionNum = parseInt(sectionNumStr, 10);
  if (!isNaN(sectionNum) && sectionNum > 0) {
    try {
      const existingSec = await db
        .select({ id: schema.electoralSections.id })
        .from(schema.electoralSections)
        .where(eq(schema.electoralSections.sectionNum, sectionNum))
        .limit(1);

      if (existingSec.length > 0 && existingSec[0]) {
        sectionId = existingSec[0].id;
      } else {
        const centers: Record<string, [number, number]> = {
          "Tonalá": [-103.2422, 20.6248],
          "Guadalajara": [-103.3496, 20.6767],
          "Zapopan": [-103.3886, 20.7214],
          "San Pedro Tlaquepaque": [-103.3150, 20.6400],
          "Tlajomulco de Zúñiga": [-103.4167, 20.4740],
          "El Salto": [-103.2333, 20.5167],
          "Zapotlanejo": [-103.0667, 20.6222]
        };
        const center = centers[municipality] || centers["Tonalá"]!;
        const offset = 0.005;
        const defaultGeom = {
          type: "Polygon",
          coordinates: [[
            [center[0] - offset, center[1] - offset],
            [center[0] + offset, center[1] - offset],
            [center[0] + offset, center[1] + offset],
            [center[0] - offset, center[1] + offset],
            [center[0] - offset, center[1] - offset]
          ]]
        };

        const [newSec] = await db
          .insert(schema.electoralSections)
          .values({
            sectionNum,
            geomJson: defaultGeom
          })
          .returning({ id: schema.electoralSections.id });

        if (newSec) {
          sectionId = newSec.id;
        }
      }
    } catch (err) {
      console.error("Error auto-resolving section in createContactAction:", err);
    }
  }

  const deps = await createExtendedContactsMutationsDependencies(db);

  const result = await registerExtendedContact(
    actor,
    {
      displayName,
      firstName: firstName || null,
      lastName: lastName || null,
      maternalLastName: maternalLastName || null,
      referredByUserId: (formData.get("referredByUserId") as string) || (formData.get("actualContactUserId") as string) || null,
      birthDate,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      addressNumber: (formData.get("addressNumber") as string) || null,
      colony,
      municipality,
      sectionId,
      profession: (formData.get("profession") as string) || null,
      companyOrWork: (formData.get("companyOrWork") as string) || null,
      yearsKnown: formData.get("yearsKnown") ? parseInt(formData.get("yearsKnown") as string, 10) : null,
      skill: (formData.get("skill") as string) || null,
      availability: (formData.get("availability") as string) || null,
      interests: (formData.get("interests") as string) || (formData.get("participatingArea") as string) || null,
      pastSupport: (formData.get("pastSupport") as string) || null
    },
    {
      ...deps,
      logger: new DevelopmentLogger(),
      permissionChecker
    }
  );

  if (!result.ok) {
    throw new Error(result.error.publicMessage ?? "No se pudo registrar el contacto.");
  }

  const contactId = result.value.contactId;

  // New Fields (ElApp Primera Etapa)
  const origin = (formData.get("origin") as string) || "toca_toca";
  const actualContactUserId = (formData.get("actualContactUserId") as string) || actor.actorId;
  const firstContactDateStr = formData.get("firstContactDate") as string;
  const firstContactDate = firstContactDateStr ? new Date(firstContactDateStr) : new Date();
  const preferredContactMethod = (formData.get("preferredContactMethod") as string) || "whatsapp";
  const preferredContactTime = (formData.get("preferredContactTime") as string) || "indiferente";
  const panMilitancy = (formData.get("panMilitancy") as string) || "no_registrada";
  const panMilitancyVerifiedAtStr = formData.get("panMilitancyVerifiedAt") as string;
  const panMilitancyVerifiedAt = panMilitancyVerifiedAtStr ? new Date(panMilitancyVerifiedAtStr) : null;
  const knowMeBetter = (formData.get("knowMeBetter") as string) || null;
  const bardaPhotoUrl = (formData.get("bardaPhotoUrl") as string) || null;
  const latStr = formData.get("exactLatitude") as string;
  const lngStr = formData.get("exactLongitude") as string;
  const exactLatitude = latStr ? parseFloat(latStr) : null;
  const exactLongitude = lngStr ? parseFloat(lngStr) : null;

  // Update contact with extended fields
  await db
    .update(schema.contacts)
    .set({
      origin,
      actualContactUserId,
      firstContactDate,
      preferredContactMethod,
      preferredContactTime,
      panMilitancy,
      panMilitancyVerifiedAt,
      knowMeBetter,
      bardaPhotoUrl,
      exactLatitude,
      exactLongitude
    })
    .where(eq(schema.contacts.id, contactId));

  // Insert initial note if provided
  const initialNote = (formData.get("initialNote") as string) || "";
  if (initialNote.trim()) {
    await db.insert(schema.contactNotes).values({
      contactId,
      authorUserId: actor.actorId,
      noteText: initialNote.trim(),
      createdAt: new Date()
    });
  }

  // Insert survey if filled
  const colonyPriorityNeed = (formData.get("survey_colonyPriorityNeed") as string) || null;
  const colonyPriorityOther = (formData.get("survey_colonyPriorityOther") as string) || null;
  const tonalaValues = (formData.get("survey_tonalaValues") as string) || null;
  const tonalaValuesOther = (formData.get("survey_tonalaValuesOther") as string) || null;
  const servicesRatingStr = formData.get("survey_servicesRating") as string;
  const servicesRatingWhy = (formData.get("survey_servicesRatingWhy") as string) || null;
  const projectExpectations = (formData.get("survey_projectExpectations") as string) || null;
  const projectExpectationsOther = (formData.get("survey_projectExpectationsOther") as string) || null;
  const participationForm = (formData.get("survey_participationForm") as string) || null;
  const participationFormOther = (formData.get("survey_participationFormOther") as string) || null;
  const openProposal = (formData.get("survey_openProposal") as string) || null;

  if (colonyPriorityNeed || tonalaValues || servicesRatingStr || projectExpectations || participationForm || openProposal) {
    await db.insert(schema.socialSurveys).values({
      contactId,
      colonyPriorityNeed,
      colonyPriorityOther,
      tonalaValues,
      tonalaValuesOther,
      servicesRating: servicesRatingStr ? parseInt(servicesRatingStr, 10) : null,
      servicesRatingWhy,
      projectExpectations,
      projectExpectationsOther,
      participationForm,
      participationFormOther,
      openProposal,
      createdAt: new Date()
    });
  }

  await processOutboxInline(db);
  revalidatePath("/crm");
  revalidatePath("/crm/contacts");
  redirect("/crm/contacts");
}
