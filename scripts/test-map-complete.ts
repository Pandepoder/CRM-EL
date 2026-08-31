import puppeteer from "puppeteer";

async function auditMapFeatures() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors: string[] = [];
  page.on("pageerror", (err: any) => {
    errors.push(`PageError: ${err.message}`);
    console.error("PAGE ERROR:", err.message);
  });
  page.on("requestfailed", (req) => {
    if (!req.url().includes("favicon.ico")) {
      errors.push(`ReqFailed: ${req.url()} (${req.failure()?.errorText})`);
      console.warn("REQ FAILED:", req.url(), req.failure()?.errorText);
    }
  });

  console.log("=== 1. Login ===");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.type('input[id="email"]', "admin.demo@tonala-os.local");
  await page.type('input[id="password"]', "TonalaDemo2026");
  await page.click('input[id="terms"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click('button[type="submit"]')
  ]);

  console.log("=== 2. Navigate to /mapa ===");
  await page.goto("http://localhost:3000/mapa", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // Check map container presence
  const mapContainer = await page.$("#leaflet-map-container");
  if (!mapContainer) throw new Error("Map container #leaflet-map-container not found!");
  console.log("✓ Leaflet container mounted");

  // Check Leaflet layers count
  const layersStatus = await page.evaluate(() => {
    const tileImages = document.querySelectorAll("#leaflet-map-container .leaflet-tile-pane img");
    const markers = document.querySelectorAll("#leaflet-map-container .leaflet-marker-pane .leaflet-marker-icon");
    const polygons = document.querySelectorAll("#leaflet-map-container .leaflet-overlay-pane svg path");
    return {
      tileImagesCount: tileImages.length,
      markersCount: markers.length,
      polygonsCount: polygons.length
    };
  });
  console.log("Initial Map State:", layersStatus);

  // === 3. Test Information Density Slider ===
  console.log("=== 3. Testing Information Density Slider ===");
  // Set slider to 1 (Territorial)
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      slider.value = "1";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: "scripts/audit-density-1.png" });
  console.log("✓ Density 1 screenshot saved");

  // Set slider to 2 (Full Cartography)
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      slider.value = "2";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: "scripts/audit-density-2.png" });
  console.log("✓ Density 2 screenshot saved");

  // === 4. Test Search Drawer ===
  console.log("=== 4. Testing Search Drawer ===");
  const searchBtn = await page.waitForSelector('button ::-p-text("Buscar")');
  if (searchBtn) {
    await searchBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: "scripts/audit-drawer-search.png" });
    console.log("✓ Search Drawer open screenshot saved");
  }

  // === 5. Test Centro de Mando (Operations List View) ===
  console.log("=== 5. Testing Centro de Mando View ===");
  const centroMandoBtn = await page.waitForSelector('button ::-p-text("Centro de Mando")');
  if (centroMandoBtn) {
    await centroMandoBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: "scripts/audit-centro-mando.png" });
    console.log("✓ Centro de Mando screenshot saved");

    // Check tabs in Centro de Mando
    const subTabs = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.map(b => b.innerText).filter(t => t.includes("Emergencias") || t.includes("Pendientes") || t.includes("Resueltas"));
    });
    console.log("Centro de Mando Sub-Tabs found:", subTabs);
  }

  // Switch back to Map
  const mapTabBtn = await page.waitForSelector('button ::-p-text("Mapa Cartográfico")');
  if (mapTabBtn) {
    await mapTabBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
  }

  // === 6. Test Reverse Geocoding API ===
  console.log("=== 6. Testing Reverse Geocode API ===");
  const geocodeRes = await page.evaluate(async () => {
    const res = await fetch("/api/map/reverse-geocode?lat=20.624&lng=-103.235");
    return { ok: res.ok, data: await res.json() };
  });
  console.log("Geocode Result:", geocodeRes);

  console.log("\n==========================================");
  console.log(`TOTAL AUDIT ERRORS ENCOUNTERED: ${errors.length}`);
  if (errors.length > 0) {
    console.log("Errors details:", errors);
  } else {
    console.log("ALL MAP SYSTEMS OPERATING NOMINALLY WITH 0 ERRORS!");
  }
  console.log("==========================================");

  await browser.close();
}

auditMapFeatures().catch(console.error);
