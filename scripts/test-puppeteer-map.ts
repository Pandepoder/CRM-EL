import puppeteer from "puppeteer";

async function testMap() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err: any) => console.error("PAGE ERROR:", err.message));
  page.on("requestfailed", (req) => console.error("REQ FAILED:", req.url(), req.failure()?.errorText));
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("favicon.ico")) {
      console.warn("HTTP ERROR:", res.status(), res.url());
    }
  });

  console.log("1. Logging in to http://localhost:3000/login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.type('input[id="email"]', "admin.demo@tonala-os.local");
  await page.type('input[id="password"]', "TonalaDemo2026");
  await page.click('input[id="terms"]');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click('button[type="submit"]')
  ]);

  console.log("2. Navigating to http://localhost:3000/mapa...");
  await page.goto("http://localhost:3000/mapa", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 4000));

  await page.screenshot({ path: "scripts/map-screenshot.png", fullPage: true });
  console.log("Screenshot saved to scripts/map-screenshot.png");

  // Check DOM text for "api key" or errors
  const pageText = await page.evaluate(() => document.body.innerText);
  if (pageText.toLowerCase().includes("api key") || pageText.toLowerCase().includes("apikey")) {
    console.log("Found 'api key' text in page!");
  } else {
    console.log("No 'api key' text found in page DOM.");
  }

  await browser.close();
}

testMap().catch(console.error);
