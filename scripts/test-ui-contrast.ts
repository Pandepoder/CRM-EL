import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:/Users/gino_/.gemini/antigravity-ide/brain/e9b3e289-7d45-428c-ade7-1488e43788a0";

async function run() {
  console.log("Authenticating via API...");
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin.demo@tonala-os.local",
      password: "TonalaDemo2026"
    })
  });

  const cookies = loginRes.headers.getSetCookie();
  console.log("Login response status:", loginRes.status, "Cookies:", cookies.length);

  if (!loginRes.ok) {
    const err = await loginRes.text();
    throw new Error(`Login failed with status ${loginRes.status}: ${err}`);
  }

  // Parse cookie for Puppeteer
  const cookieHeader = cookies[0] || "";
  const [cookiePair = ""] = cookieHeader.split(";");
  const [cookieName = "tonala_session", cookieValue = ""] = cookiePair.split("=");

  console.log(`Setting session cookie: ${cookieName}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.setCookie({
    name: cookieName.trim(),
    value: cookieValue.trim(),
    domain: "localhost",
    path: "/"
  });

  const routes = [
    { name: "01-resumen", url: "http://localhost:3001/resumen", title: "Panel General" },
    { name: "02-crm-contacts", url: "http://localhost:3001/crm/contacts", title: "Directorio General" },
    { name: "03-crm-nuevo", url: "http://localhost:3001/crm/nuevo", title: "Registro Social" },
    { name: "04-equipo", url: "http://localhost:3001/equipo", title: "Nuestra Bitácora" },
    { name: "05-admin-equipos", url: "http://localhost:3001/admin-equipos", title: "Mi Red y Equipos" },
    { name: "06-estructura-electoral", url: "http://localhost:3001/estructura-electoral", title: "Estructura Electoral" },
    { name: "07-mapa", url: "http://localhost:3001/mapa", title: "Mapa de Presencia Social" },
    { name: "08-escucha-social", url: "http://localhost:3001/escucha-social", title: "Escucha Social" },
    { name: "09-admin-incidencias", url: "http://localhost:3001/admin-incidencias", title: "Incidencias y Reportes" },
    { name: "10-perfil", url: "http://localhost:3001/perfil", title: "Mi Perfil 360" },
    { name: "11-admin-usuarios", url: "http://localhost:3001/admin-usuarios", title: "Usuarios y Redes" },
    { name: "12-settings", url: "http://localhost:3001/settings", title: "Ajustes del Sistema" }
  ];

  for (const r of routes) {
    console.log(`Auditing: ${r.title} (${r.url})`);
    await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await new Promise(res => setTimeout(res, 2000));
    const imgPath = path.join(ARTIFACT_DIR, `audit-ui-${r.name}.png`);
    await page.screenshot({ path: imgPath });
    console.log(`✓ Saved screenshot: audit-ui-${r.name}.png`);
  }

  await browser.close();
  console.log("🎉 ALL PAGES AUDITED AND HIGH-RES SCREENSHOTS SAVED TO ARTIFACTS!");
}

run().catch(err => {
  console.error("Puppeteer run error:", err);
  process.exit(1);
});
