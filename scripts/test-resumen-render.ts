import puppeteer from "puppeteer";
import path from "path";

const ARTIFACT_DIR = "C:/Users/gino_/.gemini/antigravity-ide/brain/e9b3e289-7d45-428c-ade7-1488e43788a0";

async function run() {
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

  console.log("Navigating to /resumen with full networkidle2...");
  await page.goto("http://localhost:3001/resumen", { waitUntil: "networkidle2", timeout: 20000 });
  await new Promise(res => setTimeout(res, 2000));

  const imgPath = path.join(ARTIFACT_DIR, "audit-resumen-fresh.png");
  await page.screenshot({ path: imgPath });
  console.log("✓ Saved audit-resumen-fresh.png");

  await browser.close();
}

run().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
