/**
 * Diagnostico de glifos: compara a largura de "E" e "É" na fonte serif italica
 * (Instrument Serif) — se forem iguais, o glifo acentuado nao existe na fonte.
 */
import { chromium } from "playwright-core";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const BASE = process.env.QA_BASE ?? "http://localhost:3000";

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const page = await browser.newPage();
await page.goto(`${BASE}/servicos`, { waitUntil: "networkidle" });

const out = await page.evaluate(() => {
  const el = document.querySelector(".accent");
  if (!el) return { erro: "sem .accent" };
  const cs = getComputedStyle(el);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const measure = (text, font) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return {
    classe: el.className,
    texto: el.textContent,
    fontFamily: cs.fontFamily,
    fontStyle: cs.fontStyle,
    textTransform: cs.textTransform,
    font,
    larguraE: measure("E", font),
    larguraEcomAcento: measure("\u00C9", font),
    larguraEAcomAcento: measure("\u00C1", font),
    larguraEminusculo: measure("e", font),
    larguraEcomAcentoMinusculo: measure("\u00E9", font),
    fontesCarregadas: [...document.fonts].map((f) => `${f.family}|${f.style}|${f.status}`),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
