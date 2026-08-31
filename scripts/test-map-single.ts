import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:/Users/gino_/.gemini/antigravity-ide/brain/e9b3e289-7d45-428c-ade7-1488e43788a0";

async function run() {
  console.log("Logging in via API...");
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin.demo@tonala-os.local",
      password: "TonalaDemo2026"
    })
  });
  console.log("Login status:", loginRes.status);

  const rawCookies = typeof loginRes.headers.getSetCookie === "function"
    ? loginRes.headers.getSetCookie()
    : [loginRes.headers.get("set-cookie") || ""];
  const cookieHeader = rawCookies[0] || "";
  const [cookiePair = ""] = cookieHeader.split(";");
  const [cookieName = "tonala_session", cookieValue = ""] = cookiePair.split("=");
  console.log("Setting cookie:", cookieName);

  console.log("Launching puppeteer...");
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
  await new Promise(res => setTimeout(res, 3000));

  const imgPath = path.join(ARTIFACT_DIR, "audit-ui-07-mapa.png");
  await page.screenshot({ path: imgPath });
  console.log("✓ Saved updated screenshot: audit-ui-07-mapa.png");

  await browser.close();
}

run().catch(err => {
  console.error("Puppeteer map test error:", err);
  process.exit(1);
});
