/**
 * Rodada 2: assets oficiais (CDN cashbarber), comentarios dos posts (lista de servicos),
 * abas do perfil, fotos do Google Maps e feed mais fundo do Instagram.
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_JSON = path.join(ROOT, "data", "collected");
const OUT_RAW = path.join(ROOT, "assets", "raw");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";

await mkdir(path.join(OUT_RAW, "oficial"), { recursive: true });
await mkdir(path.join(OUT_RAW, "maps"), { recursive: true });

const browser = await chromium.launch({
  executablePath: BRAVE,
  headless: true,
  args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
});
const ctx = await browser.newContext({
  userAgent: UA,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  viewport: { width: 1440, height: 1000 },
});

async function save(name, data) {
  await writeFile(path.join(OUT_JSON, name), JSON.stringify(data, null, 2), "utf8");
  console.log("[json] " + name);
}
async function grab(ctx, urls, folder, prefix, limit, minBytes = 15000) {
  await mkdir(folder, { recursive: true });
  const saved = [];
  const seen = new Set();
  for (const u of urls) {
    if (saved.length >= limit) break;
    if (!u || seen.has(u)) continue;
    seen.add(u);
    try {
      const res = await ctx.request.get(u, { headers: { Referer: "https://www.instagram.com/" } });
      if (!res.ok()) continue;
      const buf = await res.body();
      if (buf.length < minBytes) continue;
      const ct = res.headers()["content-type"] || "image/jpeg";
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const name = `${prefix}-${String(saved.length + 1).padStart(2, "0")}.${ext}`;
      await writeFile(path.join(folder, name), buf);
      saved.push({ file: name, url: u, bytes: buf.length });
    } catch {}
  }
  console.log(`[imgs] ${saved.length} -> ${path.relative(ROOT, folder)}`);
  return saved;
}

/* 1) assets oficiais do Cashbarber (logo, icone, 3 fotos de estilo) */
const official = {
  logo: "https://cdn.cashbarber.com.br/1768177336-500733.png",
  icone: "https://cdn.cashbarber.com.br/1768177337-23078.png",
  estilo1: "https://cdn.cashbarber.com.br/1768177337-260182.png",
  estilo2: "https://cdn.cashbarber.com.br/1768177338-237875.png",
  estilo3: "https://cdn.cashbarber.com.br/1768177339-114583.png",
};
const oficialImgs = await grab(ctx, Object.values(official), path.join(OUT_RAW, "oficial"), "oficial", 10, 3000);
const oficialMap = {};
Object.keys(official).forEach((k, i) => (oficialMap[k] = oficialImgs[i]?.file ?? null));
await save("assets-oficiais.json", oficialMap);

/* 2) comentarios dos posts (lista de servicos/precos) */
const posts = JSON.parse(await readFile(path.join(OUT_JSON, "instagram-posts.json"), "utf8"));
const comments = [];
for (const p of posts.filter((x) => x.link)) {
  try {
    const page = await ctx.newPage();
    await page.goto("https://www.instagram.com" + p.link, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(900);
    }
    const txt = await page.evaluate(() => document.body.innerText);
    const linhas = txt.split("\n").map((s) => s.trim()).filter(Boolean);
    const inicio = linhas.findIndex((l) => /likes|comments/i.test(l));
    comments.push({ link: p.link, trecho: linhas.slice(Math.max(0, inicio), (inicio ?? 0) + 90) });
    await page.close();
  } catch (e) {
    comments.push({ link: p.link, error: e.message });
  }
}
await save("instagram-comments.json", comments);

/* 3) abas do perfil (Cortes, Kids, Reviews) */
const tabs = {};
for (const tab of ["cortes", "kids", "reviews"]) {
  try {
    const page = await ctx.newPage();
    await page.goto(`https://www.instagram.com/duhcortebarbearia/${tab}/`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(4000);
    tabs[tab] = await page.evaluate(() => ({
      text: document.body.innerText.slice(0, 1500),
      imgs: [...new Set([...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src).filter((s) => s && /scontent/.test(s)))],
      links: [...new Set([...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) => a.getAttribute("href")))],
    }));
    await page.close();
  } catch (e) {
    tabs[tab] = { error: e.message };
  }
}
await save("instagram-tabs.json", tabs);
const tabImgs = Object.values(tabs).flatMap((t) => t.imgs || []);
await grab(ctx, tabImgs, path.join(OUT_RAW, "instagram-tabs"), "tab", 40, 12000);

/* 4) Google Maps: fotos do lugar */
let maps = { text: "", imgs: [], downloaded: [] };
try {
  const page = await ctx.newPage();
  await page.goto("https://www.google.com/maps?cid=12222460781727324303&hl=pt-BR", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(7000);
  // abre a galeria de fotos
  for (const sel of [
    'button[aria-label*="Foto"]',
    'button[aria-label*="Photos"]',
    'button[aria-label*="Ver fotos"]',
    "div[role=button][aria-label*='Pictures']",
  ]) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await page.waitForTimeout(5000);
        break;
      }
    } catch {}
  }
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(1200);
  }
  const data = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 6000),
    imgs: [...new Set(
      [...document.querySelectorAll("img")]
        .map((i) => i.currentSrc || i.src)
        .filter((s) => s && /googleusercontent|ggpht/.test(s)),
    )],
  }));
  maps.text = data.text;
  maps.imgs = data.imgs;
  maps.downloaded = await grab(ctx, data.imgs, path.join(OUT_RAW, "maps"), "map", 30, 20000);
  await page.close();
} catch (e) {
  maps.error = e.message;
}
await save("maps-fotos.json", maps);

await browser.close();
console.log("ok");
