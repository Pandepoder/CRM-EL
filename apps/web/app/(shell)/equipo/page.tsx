import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, and, gte, lte } from "drizzle-orm";
import AgendaClient from "./AgendaClient";
import { requirePageRole } from "@/lib/authorization";

export default async function EquipoMiDiaPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requirePageRole("admin", "territorial_coordinator", "visit_responsible");
  const session = await getServerSession();

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "hoy";
  
  const db = getDatabaseClient();

  let dateFilter;
  const now = new Date();
  
  if (filter === "hoy") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    dateFilter = and(
      gte(schema.visits.scheduledAt, start),
      lte(schema.visits.scheduledAt, end)
    );
  } else if (filter === "semana") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    dateFilter = and(
      gte(schema.visits.scheduledAt, start),
      lte(schema.visits.scheduledAt, end)
    );
  } else {
    dateFilter = undefined;
  }

  const userVisits = await db
    .select({
      id: schema.visits.id,
      status: schema.visits.status,
      scheduledAt: schema.visits.scheduledAt,
      location: schema.visits.visitLocationText,
      contactName: schema.contacts.displayName,
      contactId: schema.contacts.id
    })
    .from(schema.visits)
    .innerJoin(schema.contacts, eq(schema.visits.contactId, schema.contacts.id))
    .where(and(eq(schema.visits.assignedUserId, session.userId), dateFilter));

  let eventDateFilter;
  if (filter === "hoy") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    eventDateFilter = and(
      gte(schema.eventReports.eventDate, start),
      lte(schema.eventReports.eventDate, end)
    );
  } else if (filter === "semana") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    eventDateFilter = and(
      gte(schema.eventReports.eventDate, start),
      lte(schema.eventReports.eventDate, end)
    );
  } else {
    eventDateFilter = undefined;
  }

  const userEvents = await db
    .select({
      id: schema.eventReports.id,
      status: schema.eventReports.status,
      scheduledAt: schema.eventReports.eventDate,
      title: schema.eventReports.title,
      category: schema.eventReports.category,
      sectionId: schema.electoralSections.sectionNum,
    })
    .from(schema.eventReports)
    .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
    .where(and(eq(schema.eventReports.assignedToUserId, session.userId), eventDateFilter));

  const items = [
    ...userVisits.map(v => ({
      id: v.id,
      type: "visit" as const,
      status: v.status,
      scheduledAt: v.scheduledAt,
      title: v.contactName,
      location: v.location,
      contactId: v.contactId
    })),
    ...userEvents.map(e => ({
      id: e.id,
      type: "event" as const,
      status: e.status,
      scheduledAt: e.scheduledAt || new Date(),
      title: e.title,
      location: e.sectionId ? e.sectionId.toString() : "Sin ubicación",
      category: e.category
    }))
  ].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return <AgendaClient items={items} filter={filter} />;
}
