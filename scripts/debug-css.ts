import puppeteer from "puppeteer";

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
  
  page.on("console", msg => console.log("PAGE CONSOLE:", msg.type(), msg.text()));
  page.on("pageerror", (err: unknown) => console.log("PAGE ERROR:", err instanceof Error ? err.message : String(err)));
  page.on("requestfailed", req => console.log("REQUEST FAILED:", req.url(), req.failure()?.errorText));

  await page.setCookie({
    name: cookieName.trim(),
    value: cookieValue.trim(),
    domain: "localhost",
    path: "/"
  });

  await page.goto("http://localhost:3001/resumen", { waitUntil: "networkidle2" });

  const styleTags = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("link[rel='stylesheet'], style")).map(el => {
      if (el.tagName === "LINK") return { type: "link", href: (el as HTMLLinkElement).href };
      return { type: "style", text: el.textContent?.slice(0, 100) };
    });
  });

  console.log("Style tags found in DOM:", styleTags);

  const bodyClass = await page.evaluate(() => {
    return {
      bodyClass: document.body.className,
      firstDivClass: document.body.firstElementChild?.className,
      computedBodyFont: window.getComputedStyle(document.body).fontFamily,
      computedSidebarDisplay: document.querySelector(".sidebar") ? window.getComputedStyle(document.querySelector(".sidebar")!).display : "none"
    };
  });

  console.log("DOM analysis:", bodyClass);

  await browser.close();
}

run().catch(console.error);
