import "dotenv/config";
import { getDatabaseClient } from "../../apps/web/src/lib/db-client.js";
import { schema } from "@tonala/shared/database";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

const firstNames = ["Juan", "María", "José", "Ana", "Luis", "Carmen", "Carlos", "Laura", "Pedro", "Marta", "Miguel", "Lucía", "Jorge", "Sofía", "Raúl", "Elena", "Diego", "Patricia", "Andrés", "Teresa"];
const lastNames = ["García", "Martínez", "López", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Cruz", "Gómez", "Flores", "Morales", "Vázquez", "Jiménez", "Reyes"];
const categories = ["emergencia", "incidencia", "mitin", "propaganda", "servicios", "sospechoso", "brigada", "bache", "alumbrado", "fuga_agua", "inundacion", "basura", "seguridad", "lona_danada"];

const professions = ["Comerciante", "Estudiante", "Ama de casa", "Maestro/a", "Abogado/a", "Ingeniero/a", "Enfermero/a", "Mecánico", "Chofer", "Albañil"];
const skills = ["Organización de eventos", "Liderazgo vecinal", "Redes sociales", "Manejo de multitudes", "Logística", "Gestión administrativa"];
const availabilities = ["Fines de semana", "Lunes a Viernes (Tardes)", "Lunes a Viernes (Mañanas)", "Tiempo completo", "Ocasional"];
const interestsList = ["Seguridad pública", "Bacheo y pavimentación", "Alumbrado", "Apoyo al deporte", "Cultura", "Agua potable"];

function rElem(arr: any[]) { return arr[Math.floor(Math.random() * arr.length)]; }

function _rName() { return rElem(firstNames) + " " + rElem(lastNames); }
function rPhone() { return "33" + Math.floor(Math.random() * 90000000 + 10000000).toString(); }

async function run() {
  const db = getDatabaseClient();

  try {
    const adminUserRes = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.email, 'admin.demo@tonala-os.local')).limit(1);
    const adminUser = adminUserRes[0];
    if (!adminUser) throw new Error("No admin.demo@tonala-os.local user found");

    const sectionsRes = await db.select().from(schema.electoralSections).limit(20);
    const sections = sectionsRes.map(s => s.id);
    if (sections.length === 0) throw new Error("No electoral sections found");

    const coloniesRes = await db.select().from(schema.colonies).limit(20);
    const colonies = coloniesRes;
    if (colonies.length === 0) throw new Error("No colonies found");

    console.log("Generating 50 random complete contacts...");
    const contactIds: string[] = [];
    for (let i = 0; i < 50; i++) {
      const contactId = randomUUID();
      const fn = rElem(firstNames);
      const ln = rElem(lastNames);
      const mln = rElem(lastNames);
      const displayName = fn + " " + ln + " " + mln;
      const colony = rElem(colonies);
      
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - (18 + Math.floor(Math.random() * 50)));

      await db.insert(schema.contacts).values({
        id: contactId,
        displayName: displayName,
        status: "active",
        createdByUserId: adminUser.id,
        createdAt: new Date(),
        firstName: fn,
        lastName: ln,
        maternalLastName: mln,
        birthDate: birthDate,
        phone: rPhone(),
        email: fn.toLowerCase() + "." + ln.toLowerCase() + "@gmail.com",
        address: "Calle " + rElem(lastNames),
        addressNumber: Math.floor(Math.random() * 1000).toString(),
        colony: colony.name,
        municipality: "Tonalá",
        profession: rElem(professions),
        companyOrWork: "Negocio local",
        yearsKnown: Math.floor(Math.random() * 10),
        skill: rElem(skills),
        availability: rElem(availabilities),
        interests: rElem(interestsList)
      });
      contactIds.push(contactId);

      await db.insert(schema.contactAssignments).values({
        contactId,
        assignedUserId: adminUser.id,
        assignmentStatus: "active",
        assignedByUserId: adminUser.id,
        assignedAt: new Date()
      });
    }

    console.log("Generating 50 random event reports...");
    for (let i = 0; i < 50; i++) {
      const sectionId = rElem(sections);
      const date = new Date();
      date.setDate(date.getDate() + (Math.floor(Math.random() * 14) - 7)); // +- 7 days
      await db.insert(schema.eventReports).values({
        id: randomUUID(),
        title: "Reporte de " + rElem(categories).replace('_', ' '),
        description: "El ciudadano reportó una incidencia en su cuadra.",
        latitude: 20.62 + (Math.random() * 0.05),
        longitude: -103.25 + (Math.random() * 0.05),
        category: rElem(categories),
        municipality: "Tonalá",
        sectionId: sectionId,
        assignedToUserId: adminUser.id,
        eventDate: date,
        status: Math.random() > 0.5 ? "active" : "resolved",
        createdByUserId: adminUser.id,
        createdAt: new Date()
      });
    }

    console.log("Generating 50 random visits...");
    for (let i = 0; i < 50; i++) {
      const contactId = rElem(contactIds);
      const colonyId = rElem(colonies).id;
      const date = new Date();
      date.setDate(date.getDate() + (Math.floor(Math.random() * 14) - 7));
      
      const isCompleted = Math.random() > 0.5;
      
      const visitId = randomUUID();
      await db.insert(schema.visits).values({
        id: visitId,
        contactId: contactId,
        colonyId: colonyId,
        assignedUserId: adminUser.id,
        scheduledAt: date,
        status: isCompleted ? "completed" : "scheduled",
        visitLocationText: "Domicilio del contacto",
        createdByUserId: adminUser.id,
        createdAt: new Date(),
        completedAt: isCompleted ? new Date() : null,
        completedByUserId: isCompleted ? adminUser.id : null
      });

      if (isCompleted) {
        await db.insert(schema.visitResults).values({
          visitId: visitId,
          structuredOutcome: rElem(['successful', 'no_contact', 'follow_up_required', 'rejected']),
          summary: "La visita se realizó y se platicó con el simpatizante.",
          completedByUserId: adminUser.id,
          completedAt: new Date()
        });
      }
    }

    console.log("Fake data with rich fields seeded successfully!");
  } catch (error) {
    console.error("Error seeding fake data:", error);
  }
}

run().then(() => process.exit(0)).catch(() => process.exit(1));
