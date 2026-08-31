import puppeteer from "puppeteer";

async function testTileSwitching() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log("1. Logging in...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.type('input[id="email"]', "admin.demo@tonala-os.local");
  await page.type('input[id="password"]', "TonalaDemo2026");
  await page.click('input[id="terms"]');
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click('button[type="submit"]')
  ]);

  console.log("2. Going to map...");
  await page.goto("http://localhost:3000/mapa", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // Open Capas drawer
  console.log("3. Opening Capas drawer...");
  const capasBtn = await page.waitForSelector('button ::-p-text("Capas")');
  if (capasBtn) {
    await capasBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: "scripts/map-layers-screenshot.png" });
    console.log("Layers screenshot saved to scripts/map-layers-screenshot.png");
  }

  await browser.close();
}

testTileSwitching().catch(console.error);
