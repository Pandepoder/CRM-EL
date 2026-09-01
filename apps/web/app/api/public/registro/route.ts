import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, encryptData } from "@tonala/shared/database";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";

const surveySchema = z.object({
  colonyPriorityNeed: z.string().trim().max(200).optional(),
  colonyPriorityOther: z.string().trim().max(300).optional(),
  tonalaValues: z.string().trim().max(200).optional(),
  tonalaValuesOther: z.string().trim().max(300).optional(),
  servicesRating: z.coerce.number().int().min(1).max(5).optional(),
  servicesRatingWhy: z.string().trim().max(500).optional(),
  projectExpectations: z.string().trim().max(500).optional(),
  projectExpectationsOther: z.string().trim().max(300).optional(),
  participationForm: z.string().trim().max(200).optional(),
  participationFormOther: z.string().trim().max(300).optional(),
  openProposal: z.string().trim().max(1000).optional()
});

const publicRegistrationSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional(),
  maternalLastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().max(160).email().optional().or(z.literal("")),
  birthDay: z.coerce.number().int().min(1).max(31),
  birthMonth: z.coerce.number().int().min(1).max(12),
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  address: z.string().trim().max(300).optional(),
  colony: z.string().trim().max(150).optional(),
  municipality: z.string().trim().max(100).default("Tonalá"),
  sectionNum: z.coerce.number().int().positive().optional(),
  profession: z.string().trim().max(150).optional(),
  preferredContactMethod: z.string().trim().max(40).default("whatsapp"),
  preferredContactTime: z.string().trim().max(40).default("indiferente"),
  participatingArea: z.string().trim().max(200).optional(),
  knowMeBetter: z.string().trim().max(500).optional(),
  survey: surveySchema.optional()
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rl = checkRateLimit(`public-reg:${ip}`, 8, 60 * 60 * 1000); // 8 intentos por hora
    if (!rl.allowed) return rateLimitResponse(rl);

    const rawBody = await req.json();
    const parsed = publicRegistrationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de registro inválidos.", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      slug,
      firstName,
      lastName,
      maternalLastName,
      phone,
      email,
      birthDay,
      birthMonth,
      birthYear,
      address,
      colony,
      municipality,
      sectionNum,
      profession,
      preferredContactMethod,
      preferredContactTime,
      participatingArea,
      knowMeBetter,
      survey
    } = parsed.data;

    const db = getDatabaseClient();

    // 1. Resolve host user by slug
    const hostUser = await db
      .select({
        id: schema.userProfiles.id,
        displayName: schema.userProfiles.displayName,
        accessType: schema.userProfiles.accessType,
        parentEnlaceId: schema.userProfiles.parentEnlaceId
      })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.personalSlug, slug.toLowerCase()))
      .limit(1);

    if (!hostUser[0]) {
      return NextResponse.json({ error: "El enlace personal no es válido o ha expirado." }, { status: 404 });
    }

    const owner = hostUser[0];

    // 2. Detección de duplicados por teléfono
    const allContacts = await db
      .select({
        id: schema.contacts.id,
        phone: schema.contacts.phone,
        displayName: schema.contacts.displayName
      })
      .from(schema.contacts);

    const cleanInputPhone = phone.replace(/[^0-9]/g, "");
    const duplicate = allContacts.find(c => {
      if (!c.phone) return false;
      const cleanDbPhone = c.phone.replace(/[^0-9]/g, "");
      return cleanDbPhone === cleanInputPhone;
    });

    if (duplicate) {
      // Do not disclose who the phone number belongs to — this endpoint is public and unauthenticated.
      return NextResponse.json({
        error: "Este teléfono ya se encuentra registrado en el padrón."
      }, { status: 409 });
    }

    // 3. Resolve section ID if sectionNum provided
    let sectionId: string | null = null;
    if (sectionNum) {
      const secRow = await db
        .select({ id: schema.electoralSections.id })
        .from(schema.electoralSections)
        .where(eq(schema.electoralSections.sectionNum, sectionNum))
        .limit(1);
      if (secRow[0]) sectionId = secRow[0].id;
    }

    // 4. Construct birthDate
    const birthDate = new Date(Date.UTC(birthYear ?? 2000, birthMonth - 1, birthDay));

    const contactId = crypto.randomUUID();
    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ""} ${maternalLastName ? maternalLastName.trim() : ""}`.trim();

    // 5. Insert Contact
    await db.insert(schema.contacts).values({
      id: contactId,
      displayName: fullName,
      status: "active",
      createdByUserId: owner.id,
      referredByUserId: owner.id,
      actualContactUserId: owner.id,
      sectionId,
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : null,
      maternalLastName: maternalLastName ? maternalLastName.trim() : null,
      birthDate,
      phone: phone.trim(),
      email: email ? email.trim() : null,
      address: address ? address.trim() : null,
      colony: colony ? colony.trim() : "Por identificar",
      municipality: municipality.trim(),
      profession: profession ? profession.trim() : null,
      interests: participatingArea ? participatingArea.trim() : null,
      origin: "enlace_personal",
      firstContactDate: new Date(),
      preferredContactMethod,
      preferredContactTime,
      panMilitancy: "no_registrada",
      knowMeBetter: knowMeBetter ? knowMeBetter.trim() : null,
      createdAt: new Date(),
      version: 1
    });

    // 6. Insert initial note
    await db.insert(schema.contactNotes).values({
      contactId,
      authorUserId: owner.id,
      noteText: `Registro completado vía Enlace Personal de ${owner.displayName}. Área de interés: ${participatingArea || "General"}.`,
      createdAt: new Date()
    });

    // 7. Insert optional survey if answers provided
    if (survey) {
      await db.insert(schema.socialSurveys).values({
        contactId,
        colonyPriorityNeed: survey.colonyPriorityNeed || null,
        colonyPriorityOther: survey.colonyPriorityOther || null,
        tonalaValues: survey.tonalaValues || null,
        tonalaValuesOther: survey.tonalaValuesOther || null,
        servicesRating: survey.servicesRating ?? null,
        servicesRatingWhy: survey.servicesRatingWhy || null,
        projectExpectations: survey.projectExpectations || null,
        projectExpectationsOther: survey.projectExpectationsOther || null,
        participationForm: survey.participationForm || null,
        participationFormOther: survey.participationFormOther || null,
        openProposal: survey.openProposal || null,
        createdAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      contactId,
      message: "¡Registro completado exitosamente! Gracias por sumarte."
    });
  } catch (error: unknown) {
    console.error("Error in public registration:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al procesar el registro.") }, { status: 500 });
  }
}
