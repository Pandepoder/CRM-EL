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
import { processOutboxInline } from "@/lib/outbox";

export async function createContactAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor) throw new Error("Unauthorized");
  assertActorPermission(actor, Permission.ContactsCreate);

  const firstName = (formData.get("firstName") as string) || "";
  const lastName = (formData.get("lastName") as string) || "";
  const maternalLastName = (formData.get("maternalLastName") as string) || "";
  const displayName = `${firstName} ${lastName} ${maternalLastName}`.trim();

  if (!displayName) throw new Error("Name is required");

  const birthDateStr = formData.get("birthDate") as string;
  const yearsKnownStr = formData.get("yearsKnown") as string;

  const db = getDatabaseClient();
  const deps = await createExtendedContactsMutationsDependencies(db);

  const result = await registerExtendedContact(
    actor,
    {
      displayName,
      firstName: firstName || null,
      lastName: lastName || null,
      maternalLastName: maternalLastName || null,
      referredByUserId: (formData.get("referredByUserId") as string) || null,
      birthDate: birthDateStr ? new Date(birthDateStr) : null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      addressNumber: (formData.get("addressNumber") as string) || null,
      colony: (formData.get("colony") as string) || null,
      municipality: (formData.get("municipality") as string) || null,
      sectionId: (formData.get("sectionId") as string) || null,
      profession: (formData.get("profession") as string) || null,
      companyOrWork: (formData.get("companyOrWork") as string) || null,
      yearsKnown: yearsKnownStr ? parseInt(yearsKnownStr, 10) : null,
      skill: (formData.get("skill") as string) || null,
      availability: (formData.get("availability") as string) || null,
      interests: (formData.get("interests") as string) || null,
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

  await processOutboxInline(db);
  revalidatePath("/crm");
  redirect("/crm");
}
