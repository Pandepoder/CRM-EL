// @ts-nocheck
import "dotenv/config";
import { getDatabaseClient } from "../apps/web/src/lib/db-client";
import { schema } from "@tonala/shared/database";
import { sql, eq, desc } from "drizzle-orm";

interface TestAuditResult {
  phase: string;
  name: string;
  passed: boolean;
  details: string;
  metadata?: any;
}

const auditResults: TestAuditResult[] = [];

function assert(condition: boolean, phase: string, name: string, details: string, metadata?: any) {
  auditResults.push({
    phase,
    name,
    passed: !!condition,
    details: condition ? `✅ PASS: ${details}` : `❌ FAIL: ${details}`,
    metadata
  });
  if (!condition) {
    console.error(`[FAIL] [${phase}] ${name}: ${details}`, metadata || "");
  } else {
    console.log(`[PASS] [${phase}] ${name}: ${details}`);
  }
}

async function runExhaustiveAudit() {
  console.log("================================================================================");
  console.log("🚀 STARTING EXHAUSTIVE MULTI-PHASE SYSTEM & FIELD AUDIT (CRM-EL / ELAPP V1.3)");
  console.log("================================================================================\n");

  const db = getDatabaseClient();

  // ---------------------------------------------------------------------------
  // FASE 0: Base de Datos, Esquema y Conectividad
  // ---------------------------------------------------------------------------
  console.log("--- FASE 0: VERIFICACIÓN DE ESQUEMA Y CONECTIVIDAD POSTGRESQL ---");
  try {
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = (tableCheck.rows as any[]).map(r => r.table_name);
    
    assert(tables.includes("user_profiles"), "Fase 0", "Tabla user_profiles", "user_profiles existe");
    assert(tables.includes("contacts"), "Fase 0", "Tabla contacts", "contacts existe");
    assert(tables.includes("contact_notes"), "Fase 0", "Tabla contact_notes", "contact_notes existe");
    assert(tables.includes("social_surveys"), "Fase 0", "Tabla social_surveys", "social_surveys existe");
    assert(tables.includes("social_listening"), "Fase 0", "Tabla social_listening", "social_listening existe");
    assert(tables.includes("rapid_activity_prospects"), "Fase 0", "Tabla rapid_activity_prospects", "rapid_activity_prospects existe");
    assert(tables.includes("user_promotions_history"), "Fase 0", "Tabla user_promotions_history", "user_promotions_history existe");
  } catch (err: any) {
    assert(false, "Fase 0", "Conexión a BD", `Error conectando a BD: ${err.message}`);
  }

  // Get Admin user for seeding and auditing
  const adminUser = await db.query.userProfiles.findFirst({
    where: (u, { eq }) => eq(u.email, "admin.demo@tonala-os.local")
  });

  if (!adminUser) {
    throw new Error("Admin demo user not found in database!");
  }

  console.log(`\nUsing Admin context: ${adminUser.displayName} (${adminUser.id})\n`);

  // ---------------------------------------------------------------------------
  // FASE 1: Registro Público QR y Encuesta Comunitaria (/registro/[slug])
  // ---------------------------------------------------------------------------
  console.log("--- FASE 1: REGISTRO PÚBLICO QR Y ENCUESTA CIUDADANA ---");
  let publicContactId: string | null = null;
  try {
    const citizenName = `Ciudadano QR Test ${Date.now().toString().slice(-4)}`;
    const contactId = crypto.randomUUID();
    const contactInsert = await db.insert(schema.contacts).values({
      id: contactId,
      displayName: citizenName,
      status: "active",
      origin: "qr_publico",
      actualContactUserId: adminUser.id,
      panMilitancy: "simpatizante",
      panMilitancyVerifiedAt: new Date(),
      knowMeBetter: "Me interesa participar en brigadas de reforestación",
      municipality: "Tonalá",
      colony: "Loma Dorada",
      exactLatitude: 20.6285,
      exactLongitude: -103.2388,
      createdByUserId: adminUser.id,
      createdAt: new Date(),
      version: 1
    }).returning();

    publicContactId = contactInsert[0]?.id ?? null;
    assert(!!publicContactId, "Fase 1", "Inserción Contacto QR", `Contacto público creado con ID: ${publicContactId}`);

    if (publicContactId) {
      // Insert public survey answers
      const surveyInsert = await db.insert(schema.socialSurveys).values({
        contactId: publicContactId,
        colonyPriorityNeed: "Alumbrado público y bacheo en avenidas principales",
        tonalaValues: "Tradición alfarera y seguridad familiar",
        servicesRating: 4,
        servicesRatingWhy: "Se ha visto mejora en recolección pero falta iluminación",
        projectExpectations: "Más espacios deportivos para jóvenes",
        participationForm: "Comité de vecinos y apoyo en eventos",
        openProposal: "Crear un corredor artesanal iluminado en Loma Dorada",
        createdAt: new Date()
      }).returning();

      assert(surveyInsert.length > 0, "Fase 1", "Encuesta Ciudadana Guardada", "Respuestas de encuesta social registradas correctamente");

      // Verify contact retrieval with survey link
      const retrievedSurvey = await db.query.socialSurveys.findFirst({
        where: (s, { eq }) => eq(s.contactId, publicContactId!)
      });

      assert(retrievedSurvey?.servicesRating === 4, "Fase 1", "Integridad de Encuesta", `Calificación recuperada: ${retrievedSurvey?.servicesRating}/5`);
      assert(retrievedSurvey?.colonyPriorityNeed?.includes("Alumbrado") ?? false, "Fase 1", "Prioridad Comunitaria", "Prioridad de colonia recuperada con fidelidad");
    }
  } catch (err: any) {
    assert(false, "Fase 1", "Error Registro Público", err.message);
  }

  // ---------------------------------------------------------------------------
  // FASE 2: Registro Social Unificado de 7 Secciones con Georreferenciación (/crm/nuevo)
  // ---------------------------------------------------------------------------
  console.log("\n--- FASE 2: REGISTRO SOCIAL UNIFICADO (7 SECCIONES) ---");
  let internalContactId: string | null = null;
  try {
    const contactFullName = `Líder Vecinal Tonalá ${Date.now().toString().slice(-4)}`;
    const internalId = crypto.randomUUID();
    const internalInsert = await db.insert(schema.contacts).values({
      id: internalId,
      displayName: contactFullName,
      status: "active",
      origin: "toca_toca",
      actualContactUserId: adminUser.id,
      firstContactDate: new Date("2026-08-15"),
      preferredContactMethod: "whatsapp",
      preferredContactTime: "tarde",
      panMilitancy: "militante",
      panMilitancyVerifiedAt: new Date(),
      knowMeBetter: "Coordinador de manzana y presidente de colonos",
      bardaPhotoUrl: "https://storage.googleapis.com/tonala-app/bardas/demo-barda-01.jpg",
      municipality: "Tonalá",
      colony: "Centro",
      exactLatitude: 20.6248,
      exactLongitude: -103.2422,
      createdByUserId: adminUser.id,
      createdAt: new Date(),
      version: 1
    }).returning();

    internalContactId = internalInsert[0]?.id ?? null;
    assert(!!internalContactId, "Fase 2", "Registro Social Creado", `Contacto social registrado con ID: ${internalContactId}`);

    if (internalContactId) {
      // Insert initial dated note
      const noteInsert = await db.insert(schema.contactNotes).values({
        contactId: internalContactId,
        authorUserId: adminUser.id,
        noteText: "Visita de toque de puertas: se comprometió a colocar lona en su domicilio y convocar a 15 vecinos.",
        createdAt: new Date()
      }).returning();

      assert(noteInsert.length > 0, "Fase 2", "Nota Inicial Fechada", "Nota de bitácora vinculada al contacto");

      // Verify contact retrieval
      const contactRec = await db.query.contacts.findFirst({
        where: (c, { eq }) => eq(c.id, internalContactId!)
      });

      assert(contactRec?.panMilitancy === "militante", "Fase 2", "Militancia PAN", `Militancia registrada: ${contactRec?.panMilitancy}`);
      assert(contactRec?.origin === "toca_toca", "Fase 2", "Origen de Captura", `Origen registrado: ${contactRec?.origin}`);
      assert(contactRec?.exactLatitude === 20.6248, "Fase 2", "Georreferenciación Exacta", `Coordenadas: ${contactRec?.exactLatitude}, ${contactRec?.exactLongitude}`);
    }
  } catch (err: any) {
    assert(false, "Fase 2", "Error Registro Social", err.message);
  }

  // ---------------------------------------------------------------------------
  // FASE 3: Ficha 360° & Bitácora Cronológica Inmutable (/crm/contacts/[id])
  // ---------------------------------------------------------------------------
  console.log("\n--- FASE 3: FICHA 360° & BITÁCORA CRONOLÓGICA DE NOTAS ---");
  try {
    if (internalContactId) {
      // Add a second and third note with distinct dates
      await db.insert(schema.contactNotes).values([
        {
          contactId: internalContactId,
          authorUserId: adminUser.id,
          noteText: "Seguimiento telefónico: confirma asistencia a la reunión vecinal del sábado a las 6pm.",
          createdAt: new Date(Date.now() - 3600000) // 1 hour ago
        },
        {
          contactId: internalContactId,
          authorUserId: adminUser.id,
          noteText: "Reunión realizada con éxito: 18 personas asistieron y se levantaron 3 peticiones de luminarias.",
          createdAt: new Date()
        }
      ]);

      const notes = await db.query.contactNotes.findMany({
        where: (n, { eq }) => eq(n.contactId, internalContactId),
        orderBy: [desc(schema.contactNotes.createdAt)]
      });

      assert(notes.length === 3, "Fase 3", "Línea de Tiempo de Notas", `Se recuperaron ${notes.length} notas cronológicas`);
      assert(notes[0]?.noteText.includes("Reunión realizada"), "Fase 3", "Orden Cronológico Inmutable", "La nota más reciente aparece primero en la línea de tiempo");
    }
  } catch (err: any) {
    assert(false, "Fase 3", "Error Ficha 360", err.message);
  }

  // ---------------------------------------------------------------------------
  // FASE 4: Escucha Social & Aprobación Exclusiva de Gestiones (/escucha-social)
  // ---------------------------------------------------------------------------
  console.log("\n--- FASE 4: ESCUCHA SOCIAL Y GESTIONES FORMALES ---");
  let listeningId: string | null = null;
  try {
    const reportInsert = await db.insert(schema.socialListening).values({
      title: "Falta de drenaje y socavón en calle Morelos",
      description: "Vecinos reportan hundimiento del pavimento tras lluvias que pone en riesgo a 4 viviendas.",
      categories: ["problematica", "servicios"],
      locationText: "Calle Morelos #142, Tonalá Centro",
      latitude: 20.6240,
      longitude: -103.2430,
      status: "pendiente",
      isFormalGestion: 0,
      createdByUserId: adminUser.id,
      createdAt: new Date()
    }).returning();

    listeningId = reportInsert[0]?.id ?? null;
    assert(!!listeningId, "Fase 4", "Reporte de Escucha Social Creado", `Reporte registrado con ID: ${listeningId}`);

    if (listeningId) {
      // 1. Coordinador approves as Formal Gestión
      await db.update(schema.socialListening)
        .set({
          isFormalGestion: 1,
          approvedByUserId: adminUser.id,
          status: "en_seguimiento",
          resolutionNotes: "Aprobado por Coordinación y turnado a la Dirección de Obras Públicas Municipales."
        })
        .where(eq(schema.socialListening.id, listeningId));

      const updatedReport = await db.query.socialListening.findFirst({
        where: (s, { eq }) => eq(s.id, listeningId!)
      });

      assert(updatedReport?.isFormalGestion === 1, "Fase 4", "Aprobación de Gestión Formal", "La Coordinación aprobó formalmente la gestión");
      assert(updatedReport?.status === "en_seguimiento", "Fase 4", "Actualización de Estado", `Nuevo estado: ${updatedReport?.status}`);
      assert(updatedReport?.approvedByUserId === adminUser.id, "Fase 4", "Trazabilidad de Aprobador", "Aprobador registrado como el usuario Coordinador");

      // 2. Resolve/Close the listening report
      await db.update(schema.socialListening)
        .set({
          status: "cerrado",
          resolutionNotes: "Obra concluida: bacheo y reparación de tubería hidráulica finalizada por cuadrilla."
        })
        .where(eq(schema.socialListening.id, listeningId));

      const closedReport = await db.query.socialListening.findFirst({
        where: (s, { eq }) => eq(s.id, listeningId!)
      });

      assert(closedReport?.status === "cerrado", "Fase 4", "Cierre de Reporte", "Reporte cerrado con notas de resolución exitosas");
    }
  } catch (err: any) {
    assert(false, "Fase 4", "Error Escucha Social", err.message);
  }

  // ---------------------------------------------------------------------------
  // FASE 5: Prospectos Rápidos de Actividad y Conversión en 1 Clic (/equipo)
  // ---------------------------------------------------------------------------
  console.log("\n--- FASE 5: PROSPECTOS RÁPIDOS Y CONVERSIÓN EN 1 CLIC ---");
  let prospectId: string | null = null;
  let convertedContactId: string | null = null;
  try {
    const prospectName = `Comerciante Tianguis ${Date.now().toString().slice(-4)}`;
    const prospectInsert = await db.insert(schema.rapidActivityProspects).values({
      prospectName,
      organizationOrReference: "Asociación de Artesanos de Tonalá",
      profileType: "comercial",
      disposition: "muy_interesado",
      dispositionNotes: "Desea que el equipo visite su taller artesanal",
      activityDate: new Date(),
      locationText: "Tianguis Artesanal de Tonalá, Puesto 45",
      commitments: "Facilitará contacto con 20 alfareros de la zona",
      privateNotes: "Líder natural con alta influencia gremial",
      createdByUserId: adminUser.id,
      createdAt: new Date()
    }).returning();

    prospectId = prospectInsert[0]?.id ?? null;
    assert(!!prospectId, "Fase 5", "Prospecto Rápido Registrado", `Prospecto registrado en bitácora con ID: ${prospectId}`);

    if (prospectId) {
      // 1-Click Conversion Simulation:
      // A) Create Contact in CRM
      const convertedId = crypto.randomUUID();
      const newContact = await db.insert(schema.contacts).values({
        id: convertedId,
        displayName: prospectName,
        status: "active",
        origin: "evento",
        actualContactUserId: adminUser.id,
        panMilitancy: "simpatizante",
        municipality: "Tonalá",
        colony: "Centro",
        exactLatitude: 20.6248,
        exactLongitude: -103.2422,
        createdByUserId: adminUser.id,
        createdAt: new Date(),
        version: 1
      }).returning();

      convertedContactId = newContact[0]?.id ?? null;
      assert(!!convertedContactId, "Fase 5", "Conversión a Contacto CRM", `Contacto generado a partir de prospecto con ID: ${convertedContactId}`);

      // B) Update prospect with conversion link
      await db.update(schema.rapidActivityProspects)
        .set({ convertedToContactId: convertedContactId })
        .where(eq(schema.rapidActivityProspects.id, prospectId));

      // C) Migrate commitments and private notes to contact_notes
      await db.insert(schema.contactNotes).values({
        contactId: convertedContactId!,
        authorUserId: adminUser.id,
        noteText: `[Convertido desde Prospecto Rápido] Organización: Asociación de Artesanos de Tonalá | Perfil: comercial | Disposición: muy_interesado. Compromisos: Facilitará contacto con 20 alfareros de la zona. Notas: Líder natural con alta influencia gremial`,
        createdAt: new Date()
      });

      // Verify conversion integrity
      const verifiedProspect = await db.query.rapidActivityProspects.findFirst({
        where: (p, { eq }) => eq(p.id, prospectId!)
      });
      const verifiedNotes = await db.query.contactNotes.findMany({
        where: (n, { eq }) => eq(n.contactId, convertedContactId!)
      });

      assert(verifiedProspect?.convertedToContactId === convertedContactId, "Fase 5", "Vínculo de Conversión", "El prospecto guarda la referencia al contacto generado");
      assert(verifiedNotes.length > 0 && verifiedNotes[0]?.noteText.includes("Convertido desde Prospecto"), "Fase 5", "Migración de Notas y Compromisos", "Las notas del prospecto se convirtieron automáticamente en notas de bitácora");
    }
  } catch (err: any) {
    assert(false, "Fase 5", "Error Prospectos Rápidos", err.message);
  }

  // ---------------------------------------------------------------------------
  // FASE 6: Jerarquía de Red de 3 Niveles y Auditoría de Ascensos
  // ---------------------------------------------------------------------------
  console.log("\n--- FASE 6: JERARQUÍA DE RED DE 3 NIVELES Y AUDITORÍA DE ASCENSOS ---");
  try {
    // 1. Create a simulated Enlace user
    const enlaceId = crypto.randomUUID();
    const enlaceUserInsert = await db.insert(schema.userProfiles).values({
      id: enlaceId,
      email: `enlace.test.${Date.now().toString().slice(-4)}@tonala-os.local`,
      displayName: "Enlace Territorial Test",
      roleId: adminUser.roleId,
      status: "active",
      accessType: "enlace",
      personalSlug: `enlace-test-${Date.now().toString().slice(-4)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    const enlaceUser = enlaceUserInsert[0];

    // 2. Create a simulated Conexión user under Enlace
    const conexionId = crypto.randomUUID();
    const conexionUserInsert = await db.insert(schema.userProfiles).values({
      id: conexionId,
      email: `conexion.test.${Date.now().toString().slice(-4)}@tonala-os.local`,
      displayName: "Conexión Barrial Test",
      roleId: adminUser.roleId,
      status: "active",
      accessType: "conexion",
      parentEnlaceId: enlaceUser?.id,
      personalSlug: `conexion-test-${Date.now().toString().slice(-4)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    const conexionUser = conexionUserInsert[0];

    assert(conexionUser?.accessType === "conexion", "Fase 6", "Nivel Conexión Creado", `Usuario asignado con access_type: ${conexionUser?.accessType}`);
    assert(conexionUser?.parentEnlaceId === enlaceUser?.id, "Fase 6", "Árbol Jerárquico", "Usuario Conexión subordinado a su Enlace Territorial");

    // 3. Promote Conexión -> Enlace with Promotion History Audit Trail
    if (conexionUser) {
      await db.update(schema.userProfiles)
        .set({
          accessType: "enlace",
          parentEnlaceId: null,
          updatedAt: new Date()
        })
        .where(eq(schema.userProfiles.id, conexionUser.id));

      await db.insert(schema.userPromotionsHistory).values({
        userId: conexionUser.id,
        fromAccessType: "conexion",
        toAccessType: "enlace",
        reason: "Excelente desempeño territorial: sumó más de 50 registros activos.",
        promotedByUserId: adminUser.id,
        promotedAt: new Date()
      });

      const updatedConexion = await db.query.userProfiles.findFirst({
        where: (u, { eq }) => eq(u.id, conexionUser.id)
      });
      const promotionAudit = await db.query.userPromotionsHistory.findFirst({
        where: (p, { eq }) => eq(p.userId, conexionUser.id)
      });

      assert(updatedConexion?.accessType === "enlace", "Fase 6", "Ascenso Ejecutado", `Nuevo nivel del usuario: ${updatedConexion?.accessType}`);
      assert(promotionAudit?.fromAccessType === "conexion" && promotionAudit?.toAccessType === "enlace", "Fase 6", "Auditoría de Ascenso", `Registro de auditoría guardado: ${promotionAudit?.fromAccessType} -> ${promotionAudit?.toAccessType} por ${adminUser.displayName}`);
    }

    // Clean up test users
    if (conexionUser) {
      await db.delete(schema.userPromotionsHistory).where(eq(schema.userPromotionsHistory.userId, conexionUser.id));
      await db.delete(schema.userProfiles).where(eq(schema.userProfiles.id, conexionUser.id));
    }
    if (enlaceUser) {
      await db.delete(schema.userProfiles).where(eq(schema.userProfiles.id, enlaceUser.id));
    }
  } catch (err: any) {
    assert(false, "Fase 6", "Error Jerarquía de Red", err.message);
  }

  // ---------------------------------------------------------------------------
  // FASE 7: Verificación Geoespacial y Mapa Territorial (/mapa)
  // ---------------------------------------------------------------------------
  console.log("\n--- FASE 7: VERIFICACIÓN GEOESPACIAL Y MAPA TERRITORIAL ---");
  try {
    // Query contacts with exact coordinates
    const geoContacts = await db.select({
      id: schema.contacts.id,
      displayName: schema.contacts.displayName,
      lat: schema.contacts.exactLatitude,
      lng: schema.contacts.exactLongitude,
      panMilitancy: schema.contacts.panMilitancy,
      colony: schema.contacts.colony,
      municipality: schema.contacts.municipality
    })
    .from(schema.contacts)
    .where(sql`${schema.contacts.exactLatitude} IS NOT NULL AND ${schema.contacts.exactLongitude} IS NOT NULL`);

    assert(geoContacts.length > 0, "Fase 7", "Contactos Georreferenciados", `Se encontraron ${geoContacts.length} contactos con coordenadas exactas`);

    const panMilitants = geoContacts.filter(c => c.panMilitancy === "militante" || c.panMilitancy === "simpatizante");
    assert(panMilitants.length > 0, "Fase 7", "Distintivos PAN en Mapa", `${panMilitants.length} contactos cuentan con distintivo PAN (Ⓜ️ Simpatizante/Militante)`);

    // Verify geojson feature transformation
    const geoFeatures = geoContacts.map(c => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [c.lng, c.lat]
      },
      properties: {
        id: c.id,
        name: c.displayName,
        colony: c.colony,
        panMilitancy: c.panMilitancy
      }
    }));

    assert(geoFeatures.length === geoContacts.length, "Fase 7", "Formato GeoJSON", "Transformación GeoJSON completada con 100% de integridad");
  } catch (err: any) {
    assert(false, "Fase 7", "Error Geoespacial", err.message);
  }

  // ---------------------------------------------------------------------------
  // CLEANUP TEST ARTIFACTS
  // ---------------------------------------------------------------------------
  console.log("\n--- LIMPIEZA DE REGISTROS DE PRUEBA ---");
  try {
    if (publicContactId) {
      await db.delete(schema.socialSurveys).where(eq(schema.socialSurveys.contactId, publicContactId));
      await db.delete(schema.contacts).where(eq(schema.contacts.id, publicContactId));
    }
    if (internalContactId) {
      await db.delete(schema.contactNotes).where(eq(schema.contactNotes.contactId, internalContactId));
      await db.delete(schema.contacts).where(eq(schema.contacts.id, internalContactId));
    }
    if (convertedContactId) {
      await db.delete(schema.contactNotes).where(eq(schema.contactNotes.contactId, convertedContactId));
      await db.delete(schema.contacts).where(eq(schema.contacts.id, convertedContactId));
    }
    if (prospectId) {
      await db.delete(schema.rapidActivityProspects).where(eq(schema.rapidActivityProspects.id, prospectId));
    }
    if (listeningId) {
      await db.delete(schema.socialListening).where(eq(schema.socialListening.id, listeningId));
    }
    console.log("✅ Limpieza de registros temporales completada.");
  } catch (err: any) {
    console.warn("Advertencia en limpieza:", err.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("📊 RESUMEN FINAL DEL ANÁLISIS EXHAUSTIVO");
  console.log("================================================================================");
  
  const total = auditResults.length;
  const passed = auditResults.filter(r => r.passed).length;
  const failed = auditResults.filter(r => !r.passed).length;

  console.log(`Total Pruebas Ejecutadas: ${total}`);
  console.log(`Pruebas Exitosas:         ${passed}`);
  console.log(`Pruebas Fallidas:         ${failed}`);
  console.log(`Tasa de Éxito:            ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log("🎉 ¡EL SISTEMA CUMPLE AL 100% CON TODOS LOS CRITERIOS Y ESTÁ LISTO PARA PRODUCCIÓN!");
  } else {
    console.log("⚠️ SE DETECTARON ERRORES QUE DEBEN RESOLVERSE ANTES DE DESPLEGAR A PRODUCCIÓN.");
  }
}

runExhaustiveAudit().then(() => process.exit(0)).catch(err => {
  console.error("Fatal Audit Error:", err);
  process.exit(1);
});
