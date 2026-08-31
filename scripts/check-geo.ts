import dotenv from "dotenv";
dotenv.config();
import { getDatabaseClient } from "../apps/web/src/lib/db-client";
import * as schema from "../packages/shared/database/schema";

async function run() {
  const db = getDatabaseClient();
  const allSections = await db.select({
    id: schema.electoralSections.id,
    sectionNum: schema.electoralSections.sectionNum,
    municipality: schema.electoralSections.municipality
  }).from(schema.electoralSections);
  console.log('Sections list count:', allSections.length);
  const secNums = allSections.map(s => s.sectionNum).sort((a,b)=>a-b);
  console.log('Min section:', secNums[0], 'Max section:', secNums[secNums.length - 1]);
  console.log('Sample secNums:', secNums);
  console.log('Municipalities in sections:', [...new Set(allSections.map(s => s.municipality))]);
  const colonies = await db.select().from(schema.colonies);
  console.log('Total colonies in DB:', colonies.length);
  const withColGeom = colonies.filter(c => c.geomJson !== null && c.geomJson !== undefined);
  console.log('Colonies with geomJson:', withColGeom.length);
  
  const contacts = await db.select().from(schema.contacts);
  console.log('Total contacts in DB:', contacts.length);
  const contactsWithCoords = contacts.filter(c => c.latitude !== null && c.longitude !== null);
  console.log('Contacts with coords:', contactsWithCoords.length);

  const reports = await db.select().from(schema.eventReports);
  console.log('Total reports in DB:', reports.length);
  const reportsWithCoords = reports.filter(r => r.latitude !== null && r.longitude !== null);
  console.log('Reports with coords:', reportsWithCoords.length);

  process.exit(0);
}

run().catch(console.error);
