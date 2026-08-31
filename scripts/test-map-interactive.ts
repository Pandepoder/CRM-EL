import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:/Users/gino_/.gemini/antigravity-ide/brain/e9b3e289-7d45-428c-ade7-1488e43788a0";

async function run() {
  console.log("Logging in...");
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin.demo@tonala-os.local",
      password: "TonalaDemo2026"
    })
  });

  const rawCookies = typeof loginRes.headers.getSetCookie === "function"
    ? loginRes.headers.getSetCookie()
    : [loginRes.headers.get("set-cookie") || ""];
  const cookieHeader = rawCookies[0] || "";
  const [cookiePair = ""] = cookieHeader.split(";");
  const [cookieName = "tonala_session", cookieValue = ""] = cookiePair.split("=");

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

  console.log("Navigating to /mapa...");
  await page.goto("http://localhost:3001/mapa", { waitUntil: "domcontentloaded", timeout: 15000 });
  await new Promise(res => setTimeout(res, 2500));

  // 1. Capture Density 0 (Solo Incidencias)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "map-density-0-incidents.png") });
  console.log("✓ Saved map-density-0-incidents.png");

  // 2. Toggle Contacts on
  console.log("Toggling Contacts layer on...");
  const contactBtn = await page.$('button[title*="simpatizantes"]');
  if (contactBtn) {
    await contactBtn.click();
    await new Promise(res => setTimeout(res, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "map-density-with-contacts.png") });
    console.log("✓ Saved map-density-with-contacts.png");
  }

  // 3. Open Search Drawer to inspect section drawer
  console.log("Opening Search drawer...");
  const searchBtn = await page.$('button[title="Buscar"]');
  if (searchBtn) {
    await searchBtn.click();
    await new Promise(res => setTimeout(res, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "map-search-drawer.png") });
    console.log("✓ Saved map-search-drawer.png");
  }

  // 4. Switch to Tactical Dark Mode
  console.log("Switching to Tactical Dark tile style...");
  const darkBtn = await page.$('button[title="Táctico Nocturno"]');
  if (darkBtn) {
    await darkBtn.click();
    await new Promise(res => setTimeout(res, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "map-tactical-dark.png") });
    console.log("✓ Saved map-tactical-dark.png");
  }

  await browser.close();
  console.log("🎉 Interactive map tests completed successfully!");
}

run().catch(err => {
  console.error("Map interactive test error:", err);
  process.exit(1);
});
