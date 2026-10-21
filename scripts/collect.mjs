/**
 * Coleta de dados públicos da Duh Corte Barbearia.
 * Usa Brave (Chromium) via playwright-core -> executablePath, sem instalar Chrome.
 *
 * Saídas:
 *   data/collected/*.json   -> dados estruturados
 *   assets/raw/<fonte>/*.jpg-> imagens baixadas (originais, para processamento posterior)
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_JSON = path.join(ROOT, "data", "collected");
const OUT_RAW = path.join(ROOT, "assets", "raw");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";

const slug = "duhcortebarbearia";
const placeCid = "12222460781727324303";

async function ensureDirs() {
  for (const d of [OUT_JSON, OUT_RAW]) await mkdir(d, { recursive: true });
}

async function launch() {
  if (!existsSync(BRAVE)) throw new Error("Brave nao encontrado em " + BRAVE);
  return chromium.launch({
    executablePath: BRAVE,
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
}

function newContext(browser, viewport = { width: 1440, height: 900 }) {
  return browser.newContext({
    userAgent: UA,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    viewport,
    deviceScaleFactor: 1,
  });
}

async function saveJson(name, data) {
  const file = path.join(OUT_JSON, name);
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
  console.log("[json] " + path.relative(ROOT, file));
}

async function downloadImages(context, urls, folder, prefix, limit = 60) {
  await mkdir(folder, { recursive: true });
  const seen = new Set();
  const saved = [];
  for (const url of urls) {
    if (saved.length >= limit) break;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    try {
      const res = await context.request.get(url, { headers: { Referer: "https://www.instagram.com/" } });
      if (!res.ok()) continue;
      const buf = await res.body();
      if (buf.length < 12000) continue; // descarta icones/thumbs
      const ct = res.headers()["content-type"] || "image/jpeg";
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const name = `${prefix}-${String(saved.length + 1).padStart(2, "0")}.${ext}`;
      await writeFile(path.join(folder, name), buf);
      saved.push({ file: name, url, bytes: buf.length });
    } catch {
      /* ignora falha individual */
    }
  }
  console.log(`[imgs] ${saved.length} salvas em ${path.relative(ROOT, folder)}`);
  return saved;
}

/* ---------------------------------------------------------------- Instagram */
async function collectInstagram(browser) {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  const apiCalls = [];
  page.on("response", async (res) => {
    const u = res.url();
    if (/instagram\.com\/(api|graphql)/.test(u) && res.request().method() === "GET") {
      apiCalls.push({ url: u.slice(0, 400), status: res.status() });
    }
  });
  await page.goto(`https://www.instagram.com/${slug}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  // rola para disparar carregamento do grid
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 2200);
    await page.waitForTimeout(1200);
  }
  const info = await page.evaluate(() => {
    const meta = (sel, attr = "content") => document.querySelector(sel)?.getAttribute(attr) || null;
    const imgs = [...document.querySelectorAll("img")]
      .map((i) => i.currentSrc || i.src)
      .filter((s) => s && /^https?:/.test(s));
    const postLinks = [...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) =>
      a.getAttribute("href"),
    );
    const og = [...document.querySelectorAll('meta[property^="og:"]')].map((m) => [
      m.getAttribute("property"),
      m.getAttribute("content"),
    ]);
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      og,
      bodyText: document.body.innerText.slice(0, 6000),
      imgs: [...new Set(imgs)],
      postLinks: [...new Set(postLinks)],
    };
  });
  const imgs = await downloadImages(ctx, info.imgs, path.join(OUT_RAW, "instagram"), "ig");
  await saveJson("instagram.json", { ...info, imgs: undefined, downloaded: imgs, apiCalls });
  await ctx.close();
  return { imgs: imgs.length, posts: info.postLinks.length };
}

/* ------------------------------------------------------------------ Google */
async function collectMaps(browser) {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  await page.goto(`https://www.google.com/maps?cid=${placeCid}&hl=pt-BR`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(8000);
  const data = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")]
      .map((i) => i.currentSrc || i.src)
      .filter((s) => s && /googleusercontent|ggpht/.test(s));
    const text = document.body.innerText.slice(0, 8000);
    return { imgs: [...new Set(imgs)], text, title: document.title };
  });
  const imgs = await downloadImages(ctx, data.imgs, path.join(OUT_RAW, "maps"), "map", 40);
  await saveJson("maps.json", { ...data, imgs: undefined, downloaded: imgs });
  await ctx.close();
  return { imgs: imgs.length };
}

/* -------------------------------------------------------------- Cashbarber */
async function collectCashbarber(browser) {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  const payloads = [];
  page.on("response", async (res) => {
    const u = res.url();
    if (!/api\.cashbarber\.com\.br|iconcashbarber/.test(u)) return;
    const ct = res.headers()["content-type"] || "";
    if (!ct.includes("json")) return;
    try {
      const json = await res.json();
      payloads.push({ url: u, status: res.status(), json });
    } catch {
      /* ignora */
    }
  });
  await page.goto(`https://cashbarber.com.br/${slug}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(7000);
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(1500);
  }
  const text = await page.evaluate(() => document.body.innerText.slice(0, 12000));
  const imgs = await page.evaluate(() =>
    [...new Set(
      [...document.querySelectorAll("img")]
        .map((i) => i.currentSrc || i.src)
        .filter((s) => s && /^https?:/.test(s)),
    )],
  );
  const files = await downloadImages(ctx, imgs, path.join(OUT_RAW, "cashbarber"), "cb", 40);
  await saveJson("cashbarber.json", { text, imgs: undefined, downloaded: files, payloads });
  await ctx.close();
  return { payloads: payloads.length, imgs: files.length };
}

/* ------------------------------------------------------------------- Main */
const only = process.argv[2];
const browser = await launch();
await ensureDirs();
const summary = {};
try {
  if (!only || only === "instagram") summary.instagram = await collectInstagram(browser);
  if (!only || only === "maps") summary.maps = await collectMaps(browser);
  if (!only || only === "cashbarber") summary.cashbarber = await collectCashbarber(browser);
} catch (err) {
  console.error("ERRO:", err.message);
  summary.error = err.message;
} finally {
  await browser.close();
}
await saveJson("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
