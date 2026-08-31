import puppeteer from "puppeteer";

async function testDensitySlider() {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.type('input[id="email"]', "admin.demo@tonala-os.local");
  await page.type('input[id="password"]', "TonalaDemo2026");
  await page.click('input[id="terms"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.click('button[type="submit"]')
  ]);

  await page.goto("http://localhost:3000/mapa", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // Change slider using React property descriptor
  console.log("Setting density slider to 2 (Cartografía Completa)...");
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(slider, "2");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: "scripts/map-density-2-live.png" });
  console.log("Screenshot saved to scripts/map-density-2-live.png");

  const polygonCount = await page.evaluate(() => {
    return document.querySelectorAll("#leaflet-map-container .leaflet-overlay-pane svg path").length;
  });
  console.log(`Polygons rendered on map: ${polygonCount}`);

  await browser.close();
}

testDensitySlider().catch(console.error);
