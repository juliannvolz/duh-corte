/**
 * Abre cada post do perfil e extrai legenda (precos, servicos) + imagem em resolucao maxima.
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_JSON = path.join(ROOT, "data", "collected");
const OUT_RAW = path.join(ROOT, "assets", "raw", "instagram-posts");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";

const ig = JSON.parse(await readFile(path.join(OUT_JSON, "instagram.json"), "utf8"));
const links = ig.postLinks.filter((l) => l && l.includes("/p/") || l.includes("/reel/"));

const browser = await chromium.launch({
  executablePath: BRAVE,
  headless: true,
  args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
});
const ctx = await browser.newContext({
  userAgent: UA,
  locale: "pt-BR",
  viewport: { width: 1440, height: 900 },
});
await mkdir(OUT_RAW, { recursive: true });

const results = [];
for (const [i, link] of links.entries()) {
  const url = "https://www.instagram.com" + link;
  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);
    const meta = await page.evaluate(() => {
      const get = (p) => document.querySelector(p)?.getAttribute("content") || null;
      const imgs = [...document.querySelectorAll("img")]
        .map((i) => i.currentSrc || i.src)
        .filter((s) => s && /scontent/.test(s));
      return {
        title: get('meta[property="og:title"]'),
        desc: get('meta[property="og:description"]'),
        image: get('meta[property="og:image"]'),
        published: get('meta[property="article:published_time"]'),
        imgs: [...new Set(imgs)],
      };
    });
    let file = null;
    const candidates = [meta.image, ...meta.imgs].filter(Boolean);
    for (const [j, src] of candidates.entries()) {
      const big = src.replace(/s\d+x\d+/, "s1080x1080").replace(/&stp=([^&]+)/, "");
      const res = await ctx.request.get(big, { headers: { Referer: "https://www.instagram.com/" } });
      if (!res.ok()) continue;
      const buf = await res.body();
      if (buf.length < 25000) continue;
      const ct = res.headers()["content-type"] || "image/jpeg";
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const name = `post-${String(i + 1).padStart(2, "0")}${j ? `-${j}` : ""}.${ext}`;
      await writeFile(path.join(OUT_RAW, name), buf);
      file = { name, bytes: buf.length };
      if (j === 0) break;
    }
    results.push({ link, ...meta, imgs: undefined, file });
    console.log(`[ok] ${link} -> ${file?.name ?? "sem imagem"} | ${(meta.desc || "").slice(0, 90)}`);
    await page.close();
  } catch (err) {
    console.log(`[erro] ${link}: ${err.message}`);
    results.push({ link, error: err.message });
  }
}
await browser.close();
await writeFile(path.join(OUT_JSON, "instagram-posts.json"), JSON.stringify(results, null, 2), "utf8");
console.log("posts processados: " + results.length);
