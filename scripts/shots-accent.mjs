/**
 * Captura recortes em 2x de textos com acento (checagem de recorte/clipping).
 *   node scripts/shots-accent.mjs
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = path.resolve(import.meta.dirname, "..", "qa", "accent");

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  locale: "pt-BR",
});
const page = await context.newPage();

const alvos = [
  { rota: "/servicos", sel: "text=ESCOLHA O HORÁRIO", arquivo: "cta-servicos.png" },
  { rota: "/servicos", sel: "footer p.font-display, footer em", arquivo: "footer-tagline.png" },
  { rota: "/", sel: "h1", arquivo: "hero-h1.png" },
  { rota: "/", sel: "text=Quem já sentou", arquivo: "avaliacoes-quem-ja.png" },
  { rota: "/planos", sel: "h1, h2", arquivo: "planos-titulo.png" },
];

for (const alvo of alvos) {
  await page.goto(`${BASE}${alvo.rota}`, { waitUntil: "networkidle" });
  const el = page.locator(alvo.sel).first();
  if ((await el.count()) === 0) {
    console.log("ausente:", alvo.arquivo);
    continue;
  }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await el.screenshot({ path: path.join(OUT, alvo.arquivo) });
  console.log("ok", alvo.arquivo, "->", (await el.innerText()).replace(/\n/g, " / "));
}

await browser.close();
