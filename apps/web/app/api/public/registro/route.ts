import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, encryptData } from "@tonala/shared/database";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rl = checkRateLimit(`public-reg:${ip}`, 8, 60 * 60 * 1000); // 8 intentos por hora
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = await req.json();
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
      municipality = "Tonalá",
      sectionNum,
      profession,
      preferredContactMethod = "whatsapp",
      preferredContactTime = "indiferente",
      participatingArea,
      knowMeBetter,
      // Survey
      survey
    } = body;

    if (!slug) {
      return NextResponse.json({ error: "Enlace personal no especificado." }, { status: 400 });
    }

    if (!firstName || !phone || !birthDay || !birthMonth) {
      return NextResponse.json({
        error: "Nombre, teléfono y fecha de cumpleaños (día y mes) son requeridos."
      }, { status: 400 });
    }

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
      return NextResponse.json({
        error: `El teléfono ya se encuentra registrado en el padrón a nombre de ${duplicate.displayName}.`
      }, { status: 409 });
    }

    // 3. Resolve section ID if sectionNum provided
    let sectionId: string | null = null;
    if (sectionNum) {
      const secRow = await db
        .select({ id: schema.electoralSections.id })
        .from(schema.electoralSections)
        .where(eq(schema.electoralSections.sectionNum, parseInt(sectionNum, 10)))
        .limit(1);
      if (secRow[0]) sectionId = secRow[0].id;
    }

    // 4. Construct birthDate
    let birthDate: Date | null = null;
    if (birthDay && birthMonth) {
      const year = birthYear ? parseInt(birthYear, 10) : 2000;
      birthDate = new Date(Date.UTC(year, parseInt(birthMonth, 10) - 1, parseInt(birthDay, 10)));
    }

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
        servicesRating: survey.servicesRating ? parseInt(survey.servicesRating, 10) : null,
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
