"use server";

import { redirect } from "next/navigation";
import { schema } from "@tonala/shared/database";
import { actorFromSession } from "@/lib/api-helpers";
import { randomUUID } from "crypto";
import { withOutbox } from "@/lib/outbox-helper";
import { getServerSession } from "@/lib/session-server";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { getDatabaseClient } from "@/lib/db-client";
import { and, eq, isNull } from "drizzle-orm";

export async function completeOnboardingAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor) throw new Error("Unauthorized");
  const session = await getServerSession();

  const firstName = formData.get("firstName") as string || "";
  const lastName = formData.get("lastName") as string || "";
  const maternalLastName = formData.get("maternalLastName") as string || "";
  const displayName = `${firstName} ${lastName} ${maternalLastName}`.trim();
  
  if (!displayName) throw new Error("Name is required");

  const birthDateStr = formData.get("birthDate") as string;
  const birthDate = birthDateStr ? new Date(birthDateStr) : null;
  const phone = formData.get("phone") as string || null;
  const address = formData.get("address") as string || null;
  const addressNumber = formData.get("addressNumber") as string || null;
  const colony = formData.get("colony") as string || null;
  // El selector de colonia ya manda el municipio; hasta ahora se tiraba. Es el único momento
  // en que la propia persona dice dónde vive, así que de aquí sale su territorio.
  const municipality = buscarMunicipio(formData.get("municipality") as string | null)?.name ?? null;
  
  const profession = formData.get("profession") as string || null;
  const companyOrWork = formData.get("companyOrWork") as string || null;
  const skill = formData.get("skill") as string || null;
  const availability = formData.get("availability") as string || null;
  const interests = formData.get("interests") as string || null;

  const id = randomUUID();

  await withOutbox("contact", id, "ContactRegistered.v1", { 
    contact_id: id,
    created_by_user_id: actor.actorId,
    created_at: new Date().toISOString()
  }, actor.actorId, async (tx) => {
    await tx.insert(schema.contacts).values({
      id,
      displayName,
      firstName,
      lastName,
      maternalLastName,
      birthDate,
      phone,
      email: session.email || null,
      address,
      addressNumber,
      colony,
      municipality,
      profession,
      companyOrWork,
      skill,
      availability,
      interests,
      createdByUserId: actor.actorId, // Created by themselves
      createdAt: new Date(),
      status: "active",
      version: 1
    });
  });

  // Se escribe en su perfil solo si no tenía municipio: si administración ya le asignó uno,
  // manda ese. De aquí salen la marca que ve y el municipio con el que le abre el mapa.
  if (municipality) {
    const db = getDatabaseClient();
    await db
      .update(schema.userProfiles)
      .set({ municipality, updatedAt: new Date() })
      .where(and(eq(schema.userProfiles.id, actor.actorId), isNull(schema.userProfiles.municipality)));
  }

  redirect("/equipo");
}
