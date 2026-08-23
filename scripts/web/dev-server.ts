import "dotenv/config";

import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";

import {
  handleAssignmentsRequest,
  type AssignmentsHttpDependencies
} from "../../apps/web/src/http/assignments-adapter.js";
import {
  handleContactsRequest,
  type ContactsHttpDependencies
} from "../../apps/web/src/http/contacts-adapter.js";
import {
  handleTerritoryRequest,
  type TerritoryHttpDependencies
} from "../../apps/web/src/http/territory-adapter.js";
import {
  handleVisitsRequest,
  type VisitsHttpDependencies
} from "../../apps/web/src/http/visits-adapter.js";
import { loadAppEnv } from "../../packages/config/index.js";
import {
  CryptoIdGenerator as AssignmentsIdGenerator,
  DrizzleAuditWriter as AssignmentsAuditWriter,
  DrizzleContactAssignmentRepository,
  DrizzleOutboxWriter as AssignmentsOutboxWriter,
  DrizzleTransactionManager as AssignmentsTransactionManager,
  DrizzleUserDirectoryReader
} from "../../packages/modules/assignments/infrastructure/index.js";
import {
  CryptoIdGenerator as ContactsIdGenerator,
  DrizzleAuditWriter as ContactsAuditWriter,
  DrizzleContactRepository,
  DrizzleContactsReader,
  DrizzleOutboxWriter as ContactsOutboxWriter,
  DrizzleTransactionManager as ContactsTransactionManager
} from "../../packages/modules/contacts/infrastructure/index.js";
import {
  CryptoIdGenerator as TerritoryIdGenerator,
  DrizzleAuditWriter as TerritoryAuditWriter,
  DrizzleContactTerritoryRepository,
  DrizzleOutboxWriter as TerritoryOutboxWriter,
  DrizzleTerritoryCatalogReader,
  DrizzleTerritoryReader,
  DrizzleTransactionManager as TerritoryTransactionManager
} from "../../packages/modules/territory/infrastructure/index.js";
import {
  CryptoIdGenerator as VisitsIdGenerator,
  DrizzleAuditWriter as VisitsAuditWriter,
  DrizzleOutboxWriter as VisitsOutboxWriter,
  DrizzleTransactionManager as VisitsTransactionManager,
  DrizzleVisitRepository,
  DrizzleVisitResultRepository
} from "../../packages/modules/visits/infrastructure/index.js";
import { PermissionChecker } from "../../packages/shared/auth/index.js";
import { createDatabaseClient, createPgPool, type DatabasePool } from "../../packages/shared/database/index.js";
import { toSafeHttpError } from "../../packages/shared/errors/index.js";
import { DevelopmentLogger } from "../../packages/shared/observability/index.js";
import { createOutboxWorkerComposition } from "../../packages/shared/outbox/index.js";
import { registerProjectionEngineConsumer } from "../composition/projection-engine.js";
import { applyMigrations } from "../db/migrate.js";
import { seedDatabase } from "../db/seeds.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicDir = path.join(rootDir, "apps/web/public");
const port = Number(process.env.PORT ?? 3000);
const logger = new DevelopmentLogger();

type EnvState =
  | Readonly<{ ok: true; databaseUrl: string; appEnv: string }>
  | Readonly<{ ok: false; message: string }>;

const server = createServer((incoming, outgoing) => {
  void route(incoming, outgoing).catch((error: unknown) => {
    sendJson(outgoing, toSafeHttpError(error), 500);
  });
});

server.listen(port, () => {
  console.warn(`Tonala OS dev UI: http://localhost:${port}`);
});

async function route(incoming: IncomingMessage, outgoing: ServerResponse): Promise<void> {
  const request = await toRequest(incoming);
  const url = new URL(request.url);

  if (url.pathname === "/api/health" && request.method === "GET") {
    await handleHealth(outgoing);
    return;
  }

  if (url.pathname === "/api/setup" && request.method === "POST") {
    await withPool(async (_pool, env) => {
      const migrations = await applyMigrations(env.databaseUrl);
      const seeds = await seedDatabase(env.databaseUrl);
      sendJson(outgoing, { migrations, seeds });
    }, outgoing);
    return;
  }

  if (url.pathname === "/api/bootstrap" && request.method === "GET") {
    await withPool(async (pool) => {
      sendJson(outgoing, await readBootstrap(pool));
    }, outgoing);
    return;
  }

  if (url.pathname === "/api/contacts" && request.method === "GET") {
    await withPool(async (pool) => {
      sendJson(outgoing, await readContacts(pool, url.searchParams.get("q") ?? ""));
    }, outgoing);
    return;
  }

  if (url.pathname === "/api/dashboard" && request.method === "GET") {
    await withPool(async (pool) => {
      sendJson(outgoing, await readDashboard(pool));
    }, outgoing);
    return;
  }

  if (url.pathname === "/api/outbox/run-once" && request.method === "POST") {
    await withPool(async (pool) => {
      const db = createDatabaseClient(pool);
      const composition = createOutboxWorkerComposition({ db, logger });
      registerProjectionEngineConsumer({ db, logger: composition.logger, registry: composition.registry });
      const summary = await composition.worker.runOnce({
        workerId: composition.workerId,
        batchSize: 50,
        abandonedTimeoutSeconds: 300
      });
      sendJson(outgoing, summary);
    }, outgoing);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await withPool(async (pool, env) => {
      const response = await routeExistingApi(request, pool, env.appEnv);
      await writeFetchResponse(outgoing, response);
    }, outgoing);
    return;
  }

  await serveStatic(url.pathname, outgoing);
}

async function handleHealth(outgoing: ServerResponse): Promise<void> {
  const env = readEnv();
  if (!env.ok) {
    sendJson(outgoing, { ok: false, env: env.message, database: "not_checked" }, 503);
    return;
  }

  await withPool(async (pool) => {
    await pool.query("SELECT 1");
    sendJson(outgoing, { ok: true, env: env.appEnv, database: "reachable" });
  }, outgoing);
}

async function routeExistingApi(
  request: Request,
  pool: DatabasePool,
  appEnv: string
): Promise<Response> {
  const db = createDatabaseClient(pool);
  const common = {
    env: { NEXT_PUBLIC_APP_ENV: appEnv },
    logger,
    permissionChecker: new PermissionChecker()
  };

  if (request.url.includes("/api/contacts") && !request.url.includes("/territory") && !request.url.includes("/assignment")) {
    const deps: ContactsHttpDependencies = {
      ...common,
      contactRepository: new DrizzleContactRepository(db),
      transactionManager: new ContactsTransactionManager(db),
      auditWriter: new ContactsAuditWriter(),
      outboxWriter: new ContactsOutboxWriter(),
      clock: { now: () => new Date() },
      idGenerator: new ContactsIdGenerator()
    };
    return handleContactsRequest(request, deps);
  }

  if (request.url.includes("/territory")) {
    const deps: TerritoryHttpDependencies = {
      ...common,
      contactsReader: new DrizzleContactsReader(db),
      territoryCatalogReader: new DrizzleTerritoryCatalogReader(db),
      contactTerritoryRepository: new DrizzleContactTerritoryRepository(db),
      transactionManager: new TerritoryTransactionManager(db),
      auditWriter: new TerritoryAuditWriter(),
      outboxWriter: new TerritoryOutboxWriter(),
      clock: { now: () => new Date() },
      idGenerator: new TerritoryIdGenerator()
    };
    return handleTerritoryRequest(request, deps);
  }

  if (request.url.includes("/assignment")) {
    const deps: AssignmentsHttpDependencies = {
      ...common,
      contactsReader: new DrizzleContactsReader(db),
      territoryReader: new DrizzleTerritoryReader(db),
      userDirectoryReader: new DrizzleUserDirectoryReader(db),
      contactAssignmentRepository: new DrizzleContactAssignmentRepository(db),
      transactionManager: new AssignmentsTransactionManager(db),
      auditWriter: new AssignmentsAuditWriter(),
      outboxWriter: new AssignmentsOutboxWriter(),
      clock: { now: () => new Date() },
      idGenerator: new AssignmentsIdGenerator()
    };
    return handleAssignmentsRequest(request, deps);
  }

  if (request.url.includes("/api/visits")) {
    const deps: VisitsHttpDependencies = {
      ...common,
      contactsReader: new DrizzleContactsReader(db),
      territoryReader: new DrizzleTerritoryReader(db),
      assignmentsReader: new DrizzleContactAssignmentRepository(db),
      visitRepository: new DrizzleVisitRepository(db),
      visitResultRepository: new DrizzleVisitResultRepository(),
      transactionManager: new VisitsTransactionManager(db),
      auditWriter: new VisitsAuditWriter(),
      outboxWriter: new VisitsOutboxWriter(),
      clock: { now: () => new Date() },
      idGenerator: new VisitsIdGenerator()
    };
    return handleVisitsRequest(request, deps);
  }

  return Response.json({ code: "route_not_found", message: "Route was not found." }, { status: 404 });
}

async function readBootstrap(pool: DatabasePool) {
  const users = await pool.query<{
    id: string;
    display_name: string;
    email: string;
    role_key: string;
  }>(`
    SELECT user_profiles.id::text AS id, user_profiles.display_name, user_profiles.email, roles.key AS role_key
    FROM user_profiles
    INNER JOIN roles ON roles.id = user_profiles.role_id
    WHERE user_profiles.status = 'active'
    ORDER BY roles.key, user_profiles.display_name
  `);
  const colonies = await pool.query<{ id: string; name: string }>(`
    SELECT id::text AS id, name
    FROM colonies
    WHERE status = 'active'
    ORDER BY name
  `);
  return { users: users.rows, colonies: colonies.rows };
}

async function readContacts(pool: DatabasePool, query: string) {
  const like = `%${query.trim().replace(/\s+/g, " ")}%`;
  const result = await pool.query<{
    contact_id: string;
    display_name: string;
    status: string;
    created_at: Date;
    colony_id: string | null;
    colony_name: string | null;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
    scheduled_visits: string;
    completed_visits: string;
    next_visit_at: Date | null;
  }>(
    `
      SELECT
        contacts.id::text AS contact_id,
        contacts.display_name,
        contacts.status,
        contacts.created_at,
        colonies.id::text AS colony_id,
        colonies.name AS colony_name,
        assigned_user.id::text AS assigned_user_id,
        assigned_user.display_name AS assigned_user_name,
        COUNT(visits.id) FILTER (WHERE visits.status = 'scheduled')::text AS scheduled_visits,
        COUNT(visits.id) FILTER (WHERE visits.status = 'completed')::text AS completed_visits,
        MIN(visits.scheduled_at) FILTER (WHERE visits.status = 'scheduled') AS next_visit_at
      FROM contacts
      LEFT JOIN contact_territory ON contact_territory.contact_id = contacts.id
      LEFT JOIN colonies ON colonies.id = contact_territory.colony_id
      LEFT JOIN contact_assignments ON contact_assignments.contact_id = contacts.id
      LEFT JOIN user_profiles assigned_user ON assigned_user.id = contact_assignments.assigned_user_id
      LEFT JOIN visits ON visits.contact_id = contacts.id
      WHERE ($1 = '%%' OR contacts.display_name ILIKE $1 OR colonies.name ILIKE $1)
      GROUP BY contacts.id, colonies.id, colonies.name, assigned_user.id, assigned_user.display_name
      ORDER BY contacts.created_at DESC
      LIMIT 50
    `,
    [like]
  );

  return {
    contacts: result.rows.map((row) => ({
      contactId: row.contact_id,
      displayName: row.display_name,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      colonyId: row.colony_id,
      colonyName: row.colony_name,
      assignedUserId: row.assigned_user_id,
      assignedUserName: row.assigned_user_name,
      scheduledVisits: Number(row.scheduled_visits),
      completedVisits: Number(row.completed_visits),
      nextVisitAt: row.next_visit_at ? row.next_visit_at.toISOString() : null
    }))
  };
}

async function readDashboard(pool: DatabasePool) {
  const db = createDatabaseClient(pool);
  const counts = await db.execute<{
    contacts: number;
    with_territory: number;
    assigned: number;
    scheduled: number;
    completed: number;
    pending_events: number;
    dead_letters: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM contacts) AS contacts,
      (SELECT COUNT(*)::int FROM contact_territory) AS with_territory,
      (SELECT COUNT(*)::int FROM contact_assignments) AS assigned,
      (SELECT COUNT(*)::int FROM visits WHERE status = 'scheduled') AS scheduled,
      (SELECT COUNT(*)::int FROM visits WHERE status = 'completed') AS completed,
      (SELECT COUNT(*)::int FROM transactional_outbox WHERE status = 'pending') AS pending_events,
      (SELECT COUNT(*)::int FROM transactional_outbox WHERE status = 'dead_letter') AS dead_letters
  `);
  const projection = await db.execute<{
    contact_registered_count: number;
    contact_linked_count: number;
    responsible_assigned_count: number;
    visit_scheduled_count: number;
    visit_completed_count: number;
    last_event_at: Date | null;
  }>(sql`
    SELECT
      contact_registered_count,
      contact_linked_count,
      responsible_assigned_count,
      visit_scheduled_count,
      visit_completed_count,
      last_event_at
    FROM walking_skeleton_projection_v1
    WHERE projection_key = 'global'
  `);

  return {
    counts: counts.rows[0] ?? null,
    projection: projection.rows[0]
      ? {
        ...projection.rows[0],
        last_event_at: projection.rows[0].last_event_at?.toISOString() ?? null
      }
      : null
  };
}

async function withPool(
  fn: (pool: DatabasePool, env: { databaseUrl: string; appEnv: string }) => Promise<void>,
  outgoing: ServerResponse
): Promise<void> {
  const env = readEnv();
  if (!env.ok) {
    sendJson(outgoing, { code: "env_not_configured", message: env.message }, 503);
    return;
  }

  const pool = createPgPool(env.databaseUrl);
  try {
    await fn(pool, { databaseUrl: env.databaseUrl, appEnv: env.appEnv });
  } catch (error) {
    const safe = toSafeHttpError(error);
    sendJson(outgoing, { code: safe.code, message: safe.message, diagnostic: safe.diagnostic }, safe.status);
  } finally {
    await pool.end();
  }
}

function readEnv(): EnvState {
  try {
    const env = loadAppEnv();
    return { ok: true, databaseUrl: env.private.DATABASE_URL, appEnv: env.public.NEXT_PUBLIC_APP_ENV };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Invalid environment configuration."
    };
  }
}

async function serveStatic(urlPathname: string, outgoing: ServerResponse): Promise<void> {
  const safePath = urlPathname === "/" ? "index.html" : urlPathname.replace(/^\/+/, "");
  const target = path.resolve(publicDir, safePath);
  if (!target.startsWith(publicDir)) {
    sendJson(outgoing, { code: "not_found", message: "Not found." }, 404);
    return;
  }

  try {
    const body = await readFile(target);
    outgoing.writeHead(200, { "content-type": contentType(target) });
    outgoing.end(body);
  } catch {
    const fallback = await readFile(path.join(publicDir, "index.html"));
    outgoing.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    outgoing.end(fallback);
  }
}

async function toRequest(incoming: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as Uint8Array));
  }
  const origin = `http://${incoming.headers.host ?? `localhost:${port}`}`;
  const init: RequestInit = {
    headers: incoming.headers as HeadersInit
  };
  if (incoming.method) init.method = incoming.method;
  if (chunks.length > 0) init.body = Buffer.concat(chunks);
  return new Request(new URL(incoming.url ?? "/", origin), init);
}

async function writeFetchResponse(outgoing: ServerResponse, response: Response): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  outgoing.writeHead(response.status, headers);
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

function sendJson(outgoing: ServerResponse, body: unknown, status = 200): void {
  outgoing.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  outgoing.end(JSON.stringify(body));
}

function contentType(target: string): string {
  if (target.endsWith(".css")) return "text/css; charset=utf-8";
  if (target.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (target.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

