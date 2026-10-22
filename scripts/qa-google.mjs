import { chromium } from "playwright-core";

const BASE = process.env.QA_BASE ?? "https://duh-corte.vercel.app";
const BRAVE =
  "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Entrar com Google/i }).click();
await page.waitForURL(/accounts\.google\.com|google\.com\/signin/, { timeout: 30000 });
await page.waitForTimeout(2500);

const url = new URL(page.url());
console.log("url do provedor:", url.origin + url.pathname);
console.log("client_id:", url.searchParams.get("client_id"));
console.log("redirect_uri:", url.searchParams.get("redirect_uri"));
console.log("scope:", url.searchParams.get("scope"));

const texto = (await page.innerText("body")).slice(0, 320).replace(/\s+/g, " ");
console.log("texto na tela:", texto);
const erro = /error|invalid|erro|redirect_uri|not valid|mismatch/i.test(texto);
console.log(erro ? "ATENCAO: erro na tela do provedor" : "sem erro na tela do provedor (redirect_uri aceito)");

await page.screenshot({ path: "qa/screens/google-login.png" });
await browser.close();
