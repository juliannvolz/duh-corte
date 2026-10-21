/**
 * Rodada 3:Upgrade das miniaturas do grid (s640 -> s1080), thumbnails de reels via oembed,
 * e posts das abas (Cortes / Kids / Reviews) com legenda + imagem.
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

const ig = JSON.parse(await readFile(path.join(OUT_JSON, "instagram.json"), "utf8"));
const tabs = JSON.parse(await readFile(path.join(OUT_JSON, "instagram-tabs.json"), "utf8"));

const browser = await chromium.launch({
  executablePath: BRAVE,
  headless: true,
  args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
});
const ctx = await browser.newContext({
  userAgent: UA,
  locale: "pt-BR",
  viewport: { width: 1440, height: 1000 },
});
await mkdir(path.join(OUT_RAW, "grid-hd"), { recursive: true });
await mkdir(path.join(OUT_RAW, "tabs-posts"), { recursive: true });

/* upgrade do grid */
const upgraded = [];
for (const d of ig.downloaded || []) {
  const big = d.url
    .replace(/s\d+x\d+/, "s1080x1080")
    .replace(/stp=dst-jpg_s\d+x\d+/, "stp=dst-jpg_s1080x1080")
    .replace(/stp=([^&]+)/, "")
    .replace(/&_nc_zt=([^&]+)/, "");
  try {
    const res = await ctx.request.get(big, { headers: { Referer: "https://www.instagram.com/" } });
    if (!res.ok()) continue;
    const buf = await res.body();
    if (buf.length < 40000) continue;
    const name = `grid-${String(upgraded.length + 1).padStart(2, "0")}.jpg`;
    await writeFile(path.join(OUT_RAW, "grid-hd", name), buf);
    upgraded.push({ file: name, bytes: buf.length, url: big });
  } catch {}
}
console.log(`[grid-hd] ${upgraded.length}`);

/* oembed de todos os posts (reels + fotos) */
const allLinks = [
  ...new Set([
    ...(ig.postLinks || []),
    ...Object.values(tabs).flatMap((t) => t.links || []),
  ]),
].filter((l) => l && (l.includes("/p/") || l.includes("/reel/")));

const oembed = [];
for (const link of allLinks) {
  const url = "https://www.instagram.com" + link;
  try {
    const res = await ctx.request.get(
      "https://api.instagram.com/oembed/?url=" + encodeURIComponent(url) + "&maxwidth=1080",
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok()) {
      oembed.push({ link, error: res.status() });
      continue;
    }
    const j = await res.json();
    oembed.push({ link, title: j.title, author: j.author_name, thumb: j.thumbnail_url, width: j.thumbnail_width, height: j.thumbnail_height });
  } catch (e) {
    oembed.push({ link, error: e.message });
  }
}
const withThumb = oembed.filter((o) => o.thumb);
console.log(`[oembed] ${withThumb.length}/${oembed.length}`);

const thumbs = [];
for (const [i, o] of withThumb.entries()) {
  try {
    const res = await ctx.request.get(o.thumb, { headers: { Referer: "https://www.instagram.com/" } });
    if (!res.ok()) continue;
    const buf = await res.body();
    if (buf.length < 20000) continue;
    const name = `tab-${String(i + 1).padStart(2, "0")}.jpg`;
    await writeFile(path.join(OUT_RAW, "tabs-posts", name), buf);
    thumbs.push({ file: name, bytes: buf.length, link: o.link, title: o.title, author: o.author });
  } catch {}
}
console.log(`[thumbs] ${thumbs.length}`);

/* legenda completa dos posts das abas */
const legendas = [];
for (const link of allLinks) {
  if (oembed.find((o) => o.link === link)?.title) {
    legendas.push({ link, desc: oembed.find((o) => o.link === link).title });
  }
}

await writeFile(
  path.join(OUT_JSON, "instagram-oembed.json"),
  JSON.stringify({ oembed, thumbs, legendas }, null, 2),
  "utf8",
);
await browser.close();
console.log("ok");
