import { chromium } from "playwright-core";

const BASE = "https://duh-corte.vercel.app";
const BRAVE =
  "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Entrar com Facebook/i }).click();
await page.waitForURL(/facebook\.com/, { timeout: 30000 });
await page.waitForTimeout(2500);

const url = new URL(page.url());
console.log("url do provedor:", url.origin + url.pathname);
console.log("redirect_uri enviado:", url.searchParams.get("redirect_uri"));
console.log("scope:", url.searchParams.get("scope"));
console.log("client_id:", url.searchParams.get("client_id"));

const texto = (await page.innerText("body")).slice(0, 400).replace(/\s+/g, " ");
console.log("texto na tela:", texto);

const temErro = /redirect_uri|invalid|erro|error|mismatch|not valid/i.test(texto);
console.log(temErro ? "ATENCAO: a tela do provedor acusa erro" : "sem erro na tela do provedor");

await page.screenshot({ path: "qa/screens/facebook-login.png" });
await browser.close();
