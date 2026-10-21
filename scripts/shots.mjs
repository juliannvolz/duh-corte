/**
 * Captura por secao, para revisao visual em 1440px.
 *   node scripts/shots.mjs
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "qa", "sections");

const SECTIONS = [
  "#servicos",
  "#planos",
  "#equipe",
  "#galeria",
  "#avaliacoes",
  "#local",
];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1000);

  // revela tudo (scrolled through once)
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
  });
  await page.waitForTimeout(600);

  const shots = {};
  for (const sel of SECTIONS) {
    const el = page.locator(sel).first();
    if ((await el.count()) === 0) {
      shots[sel] = "ausente";
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const name = `${sel.replace("#", "").replace(/[^\w]/g, "")}.png`;
    await page.screenshot({ path: path.join(OUT, name), fullPage: false });
    shots[sel] = name;
  }

  // rodape
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "footer.png") });

  await browser.close();
  await writeFile(path.join(OUT, "shots.json"), JSON.stringify(shots, null, 2), "utf8");
  console.log(JSON.stringify(shots, null, 2));
}

run().catch((error) => {
  console.error("falhou:", error);
  process.exit(1);
});
