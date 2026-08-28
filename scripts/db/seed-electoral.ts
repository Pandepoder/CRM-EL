import "dotenv/config";
import { getDatabaseClient } from "../../apps/web/src/lib/db-client.js";
import { schema } from "@tonala/shared/database";

const electoralRoles = ["Coordinador de Zona", "Representante General (RG)", "Representante de Casilla (RC)", "Promotor"];

async function run() {
  const db = getDatabaseClient();

  try {
    const users = await db.select().from(schema.userProfiles);
    if (users.length === 0) throw new Error("No users found");

    const sectionsRes = await db.select().from(schema.electoralSections).limit(20);
    const sections = sectionsRes.map(s => s.id);
    if (sections.length === 0) throw new Error("No electoral sections found");

    const teams = await db.select().from(schema.teams);
    if (teams.length === 0) throw new Error("No teams found");

    console.log("Seeding electoral representatives...");
    for (const user of users) {
      if (Math.random() > 0.3) { // 70% chance to assign a user to an electoral section
        const sectionId = sections[Math.floor(Math.random() * sections.length)];
        const role = electoralRoles[Math.floor(Math.random() * electoralRoles.length)] ?? "Promotor";
        
        if (sectionId && user?.id) {
          await db.insert(schema.electoralRepresentatives).values({
            sectionId,
            userId: user.id,
            role,
            assignedAt: new Date()
          }).onConflictDoNothing();
        }
      }
    }

    console.log("Adding users to teams...");
    for (const team of teams) {
      // Add random users to each team
      const teamSize = Math.floor(Math.random() * 3) + 2; // 2 to 4 users per team
      for (let i = 0; i < teamSize; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        if (user?.id && team?.id) {
          await db.insert(schema.teamMembers).values({
            teamId: team.id,
            userId: user.id,
            joinedAt: new Date()
          }).onConflictDoNothing();
        }
      }
    }

    console.log("Electoral and Teams data seeded successfully!");
  } catch (error) {
    console.error("Error seeding:", error);
  }
}

run().then(() => process.exit(0)).catch(() => process.exit(1));
