import puppeteer from "puppeteer";

async function testSectionDrawer() {
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

  // Set slider to 2
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(slider, "2");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 1000));

  // Click on the first SVG polygon path in the map overlay
  console.log("Clicking on a section polygon...");
  await page.evaluate(() => {
    const path = document.querySelector("#leaflet-map-container .leaflet-overlay-pane svg path");
    if (path) {
      (path as any).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }
  });

  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: "scripts/map-section-drawer.png" });
  console.log("Section drawer screenshot saved to scripts/map-section-drawer.png");

  await browser.close();
}

testSectionDrawer().catch(console.error);
