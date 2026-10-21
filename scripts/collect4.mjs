/**
 * Coleta rodada 4:
 *  (a) Google Maps — fotos do lugar (painel de fotos)
 *  (b) Instagram reels — poster/frame e URL do video para uso como conteudo
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

await mkdir(path.join(OUT_RAW, "maps"), { recursive: true });
await mkdir(path.join(OUT_RAW, "reels"), { recursive: true });

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

async function grab(urls, folder, prefix, limit, minBytes) {
  const saved = [];
  const seen = new Set();
  for (const u of urls) {
    if (saved.length >= limit) break;
    if (!u || seen.has(u)) continue;
    seen.add(u);
    try {
      const res = await ctx.request.get(u, { headers: { Referer: "https://www.google.com/" } });
      if (!res.ok()) continue;
      const buf = await res.body();
      if (buf.length < minBytes) continue;
      const ct = res.headers()["content-type"] || "image/jpeg";
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const name = `${prefix}-${String(saved.length + 1).padStart(2, "0")}.${ext}`;
      await writeFile(path.join(folder, name), buf);
      saved.push({ file: name, bytes: buf.length, url: u });
    } catch {}
  }
  return saved;
}

/* (a) Maps */
let maps = { photos: [], text: "" };
try {
  const page = await ctx.newPage();
  await page.goto("https://www.google.com/maps/search/Duh+Corte+Barbearia+Jaragu%C3%A1+do+Sul", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(9000);
  // clicar no resultado
  for (const sel of ['div[role="feed"] > div[role="article"]', 'button[aria-label*="Duh Corte"]', 'a[aria-label*="Duh Corte"]']) {
    const el = await page.$(sel);
    if (el) {
      await el.click().catch(() => {});
      await page.waitForTimeout(6000);
      break;
    }
  }
  // abrir a aba de fotos
  for (const sel of ['button[aria-label*="Fotos"]', 'button[aria-label*="Photos"]', 'button[aria-label*="Ver todas as fotos"]', 'div[role="button"][aria-label*="Fotos"]']) {
    const el = await page.$(sel);
    if (el) {
      await el.click().catch(() => {});
      await page.waitForTimeout(6000);
      break;
    }
  }
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(1000);
  }
  const data = await page.evaluate(() => ({
    text: document.body.innerText.slice(0, 4000),
    imgs: [...new Set(
      [...document.querySelectorAll("img")]
        .map((i) => i.currentSrc || i.src)
        .filter((s) => s && /googleusercontent|ggpht/.test(s)),
    )],
  }));
  maps.text = data.text;
  maps.photos = await grab(data.imgs, path.join(OUT_RAW, "maps"), "map", 30, 25000);
  console.log("[maps] fotos:", maps.photos.length);
  await page.close();
} catch (e) {
  maps.error = e.message;
  console.log("[maps] erro:", e.message);
}
await writeFile(path.join(OUT_JSON, "maps-fotos2.json"), JSON.stringify(maps, null, 2), "utf8");

/* (b) reels: poster + video */
const posts = JSON.parse(await readFile(path.join(OUT_JSON, "instagram-posts.json"), "utf8"));
const reels = [];
for (const p of posts.filter((x) => x.link?.includes("/reel/"))) {
  try {
    const page = await ctx.newPage();
    const videos = [];
    page.on("response", (res) => {
      if (/\.mp4|video/i.test(res.url()) && res.request().resourceType() === "media") {
        videos.push(res.url());
      }
    });
    await page.goto("https://www.instagram.com" + p.link, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(6000);
    const media = await page.evaluate(() => {
      const vids = [...document.querySelectorAll("video")].map((v) => v.currentSrc || v.src).filter(Boolean);
      const posters = [...document.querySelectorAll("video")].map((v) => v.poster).filter(Boolean);
      const imgs = [...document.querySelectorAll("img")]
        .map((i) => i.currentSrc || i.src)
        .filter((s) => s && /scontent/.test(s) && !/avatar|profile|s150|s64/.test(s));
      const json = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent);
      return { vids, posters, imgs, json };
    });
    const poster = media.posters[0] || media.imgs[0] || null;
    let posterFile = null;
    if (poster) {
      const res = await ctx.request.get(poster, { headers: { Referer: "https://www.instagram.com/" } });
      if (res.ok()) {
        const buf = await res.body();
        if (buf.length > 20000) {
          const name = `reel-${reels.length + 1}.jpg`;
          await writeFile(path.join(OUT_RAW, "reels", name), buf);
          posterFile = { file: name, bytes: buf.length, url: poster };
        }
      }
    }
    reels.push({ link: p.link, poster: posterFile, videos: media.vids.slice(0, 2), networkVideos: videos.slice(0, 2) });
    console.log(`[reel] ${p.link} poster=${posterFile?.file ?? "n/a"} video=${media.vids.length}`);
    await page.close();
  } catch (e) {
    reels.push({ link: p.link, error: e.message });
  }
}
await writeFile(path.join(OUT_JSON, "reels.json"), JSON.stringify(reels, null, 2), "utf8");
await browser.close();
console.log("ok");
