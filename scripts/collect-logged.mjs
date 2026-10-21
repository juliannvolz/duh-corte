/**
 * Testa acesso logado ao Instagram usando um COPIA do perfil do Brave do usuario
 * (Brave esta em uso -> copiamos cookies/prefs e subimos uma instancia isolada).
 * Se a sessao estiver valida, o grid completo e os thumbnails de reels ficam acessiveis.
 */
import { chromium } from "playwright-core";
import { mkdir, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const SRC = path.join(process.env.LOCALAPPDATA, "BraveSoftware", "Brave-Browser", "User Data");
const DST = path.join(os.tmpdir(), "brave-ig-profile");
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_RAW = path.join(ROOT, "assets", "raw", "ig-logado");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36";

await rm(DST, { recursive: true, force: true });
await mkdir(path.join(DST, "Default", "Network"), { recursive: true });
await mkdir(path.join(DST, "Default", "Local Storage", "leveldb"), { recursive: true });
await mkdir(path.join(DST, "Default", "Session Storage"), { recursive: true });
await mkdir(OUT_RAW, { recursive: true });

const copies = [
  ["Local State", "Local State"],
  ["Default\\Preferences", "Default\\Preferences"],
  ["Default\\Network\\Cookies", "Default\\Network\\Cookies"],
  ["Default\\Network\\Network Persistent State", "Default\\Network\\Network Persistent State"],
  ["Default\\Login Data", "Default\\Login Data"],
];
for (const [from, to] of copies) {
  const s = path.join(SRC, from);
  if (existsSync(s)) {
    try {
      await copyFile(s, path.join(DST, to));
      console.log("copiado " + from);
    } catch (e) {
      console.log("falhou " + from + ": " + e.message);
    }
  }
}

const ctx = await chromium.launchPersistentContext(DST, {
  executablePath: BRAVE,
  headless: true,
  args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--profile-directory=Default"],
  userAgent: UA,
  locale: "pt-BR",
  viewport: { width: 1440, height: 1000 },
});
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto("https://www.instagram.com/duhcortebarbearia/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(7000);
const logged = await page.evaluate(() => ({
  text: document.body.innerText.slice(0, 1200),
  hasLoginWall: /Cadastre-se|Entrar para curtir/.test(document.body.innerText),
  links: [...new Set([...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) => a.getAttribute("href")))],
  imgs: [...new Set([...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src).filter((s) => s && /scontent/.test(s)))],
}));
console.log("=== LOGGED IN? ===", !logged.hasLoginWall);
console.log(logged.text.slice(0, 600));
console.log("links:", logged.links.length, "imgs:", logged.imgs.length);

// rola o grid inteiro
for (let i = 0; i < 25; i++) {
  await page.mouse.wheel(0, 2500);
  await page.waitForTimeout(900);
}
const full = await page.evaluate(() => ({
  links: [...new Set([...document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')].map((a) => a.getAttribute("href")))],
  imgs: [...new Set([...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src).filter((s) => s && /scontent/.test(s)))],
}));
console.log("apos scroll -> links:", full.links.length, "imgs:", full.imgs.length);

const saved = [];
for (const [i, u] of full.imgs.entries()) {
  const big = u.replace(/s\d+x\d+/, "s1080x1080").replace(/stp=dst-jpg_s\d+x\d+/, "stp=dst-jpg_s1080x1080");
  try {
    const res = await ctx.request.get(big, { headers: { Referer: "https://www.instagram.com/" } });
    if (!res.ok()) continue;
    const buf = await res.body();
    if (buf.length < 40000) continue;
    const name = `ig-${String(i + 1).padStart(2, "0")}.jpg`;
    await writeFile(path.join(OUT_RAW, name), buf);
    saved.push({ file: name, bytes: buf.length, url: big });
  } catch {}
}
console.log("baixadas:", saved.length);
await writeFile(
  path.join(ROOT, "data", "collected", "instagram-logado.json"),
  JSON.stringify({ loggedIn: !logged.hasLoginWall, links: full.links, saved }, null, 2),
  "utf8",
);
await ctx.close();
console.log("ok");
