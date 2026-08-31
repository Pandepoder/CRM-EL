/**
 * Comprehensive QA Test Suite
 * Tests all end-to-end user journeys against the running HTTP server.
 */

const BASE_URL = "http://localhost:3000";

type TestResult = {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
};

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    results.push({ name, passed: false, durationMs: Date.now() - start, error: errorMsg });
    console.error(`  ✗ ${name}: ${errorMsg}`);
  }
}

async function runQA() {
  console.log("\n==========================================");
  console.log("🚀 EJECUTANDO SUITE INTEGRAL DE QA");
  console.log("==========================================\n");

  let sessionCookie = "";
  let sampleUserId = "";

  // 1. Health & Database Connectivity
  await test("1.1 Healthcheck API (/api/health) responde 200 y BD conectada", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok") throw new Error(`Health status: ${data.status}`);
  });

  // 2. Authentication & Authorization
  await test("2.1 Intento de login con credenciales inválidas es rechazado (401)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "fake@test.com", password: "wrong" })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const data = await res.json();
    if (data.code !== "invalid_credentials") throw new Error(`Unexpected error code: ${data.code}`);
  });

  await test("2.2 Login exitoso como Admin Demo (200) y redirección correcta a /crm", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin.demo@tonala-os.local", password: "TonalaDemo2026" })
    });
    if (!res.ok) throw new Error(`Login failed with status ${res.status}`);
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error("No set-cookie header received");
    sessionCookie = setCookie.split(";")[0] ?? "";
    const data = await res.json();
    if (!data.ok || !data.redirectTo?.startsWith("/crm")) {
      throw new Error(`Unexpected login response: ${JSON.stringify(data)}`);
    }
  });

  // 3. User Directory
  await test("3.1 Listado de usuarios activos del sistema (/api/crm/users)", async () => {
    const res = await fetch(`${BASE_URL}/api/crm/users`, {
      headers: { Cookie: sessionCookie }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) throw new Error("No users returned");
    const organizer = users.find((u: any) => u.email === "organizador.demo@tonala-os.local") || users[0];
    sampleUserId = organizer.id || organizer.userId;
    if (!sampleUserId) throw new Error("Could not extract sample user ID");
  });

  // 4. Operational Summary & Analytics
  await test("4.1 Tablero de Resumen Operacional (/api/resumen) responde con métricas", async () => {
    const res = await fetch(`${BASE_URL}/api/resumen`, {
      headers: { Cookie: sessionCookie }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (typeof data.contacts !== "number" || typeof data.usersActive !== "number") {
      throw new Error(`Invalid summary structure: ${JSON.stringify(data)}`);
    }
  });

  // 5. Map & Territory GeoJSON & Reverse Geocoding
  await test("5.1 Carga de secciones electorales en GeoJSON (/api/map/sections/geojson)", async () => {
    const res = await fetch(`${BASE_URL}/api/map/sections/geojson`, {
      headers: { Cookie: sessionCookie }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      throw new Error("Invalid FeatureCollection");
    }
  });

  await test("5.2 Geocodificación Inversa y Detección Municipal (/api/map/reverse-geocode)", async () => {
    const res = await fetch(`${BASE_URL}/api/map/reverse-geocode?lat=20.6245&lng=-103.2345`, {
      headers: { Cookie: sessionCookie }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.municipality || !data.address) {
      throw new Error(`Unexpected geocode data: ${JSON.stringify(data)}`);
    }
  });

  // 6. Map Incident Report Creation & Status Update
  let testReportId = "";
  await test("6.1 Creación de reporte de incidencia en mapa (/api/map/reports)", async () => {
    const res = await fetch(`${BASE_URL}/api/map/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        title: "QA Test Incidencia Luminaria",
        description: "Prueba automatizada de luminaria apagada",
        latitude: 20.6245,
        longitude: -103.2345,
        category: "servicios",
        municipality: "Tonalá"
      })
    });
    if (res.status !== 201) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    if (!data.id || data.title !== "QA Test Incidencia Luminaria") {
      throw new Error(`Unexpected report data: ${JSON.stringify(data)}`);
    }
    testReportId = data.id;
  });

  await test("6.2 Listado y verificación de incidencia en GeoJSON (/api/map/reports)", async () => {
    const res = await fetch(`${BASE_URL}/api/map/reports`, {
      headers: { Cookie: sessionCookie }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const found = data.features.some((f: any) => f.properties.id === testReportId);
    if (!found) throw new Error("Created report not found in GeoJSON features");
  });

  await test("6.3 Transición de estatus de incidencia a 'resolved' (/api/map/reports/[id])", async () => {
    const res = await fetch(`${BASE_URL}/api/map/reports/${testReportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ status: "resolved" })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    if (data.status !== "resolved") throw new Error("Status update failed");
  });

  await test("6.4 Acciones masivas de administración de incidencias (/api/map/reports/bulk)", async () => {
    const res = await fetch(`${BASE_URL}/api/map/reports/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        action: "reopen",
        ids: [testReportId]
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    const data = await res.json();
    if (!data.success) throw new Error("Bulk action failed");
  });

  // 7. Teams & Members
  let testTeamId = "";
  await test("7.1 Creación de equipo de brigada (/api/admin/teams)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        name: "QA Brigada Centro",
        leaderId: sampleUserId,
        zone: "Zona 1",
        municipality: "Tonalá"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.success || !data.id) throw new Error("Team creation failed");
    testTeamId = data.id;
  });

  await test("7.2 Adición de miembro al equipo (/api/admin/teams/[id]/members)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/teams/${testTeamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ userId: sampleUserId })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.success) throw new Error("Add member failed");
  });

  await test("7.3 Prevención de miembro duplicado en equipo (400)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/teams/${testTeamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ userId: sampleUserId })
    });
    if (res.status !== 400) throw new Error(`Expected 400 for duplicate member, got ${res.status}`);
  });

  await test("7.4 Eliminación de miembro del equipo (/api/admin/teams/[id]/members)", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/teams/${testTeamId}/members?userId=${sampleUserId}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.success) throw new Error("Delete member failed");
  });

  // 8. CSV Export
  await test("8.1 Exportación de contactos en formato CSV UTF-8 (/api/crm/contacts/export)", async () => {
    const res = await fetch(`${BASE_URL}/api/crm/contacts/export`, {
      headers: { Cookie: sessionCookie }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("text/csv")) throw new Error(`Unexpected content-type: ${contentType}`);
    const text = await res.text();
    if (!text.includes("Nombre Completo") || !text.includes("Teléfono")) {
      throw new Error("CSV headers missing expected column names");
    }
  });

  // Summary
  console.log("\n==========================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`📊 RESULTADOS QA: ${passed}/${total} PRUEBAS PASADAS (${failed === 0 ? "100% EXITOSO" : `${failed} FALLIDAS`})`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runQA().catch((err) => {
  console.error("QA Runner uncaught error:", err);
  process.exit(1);
});
