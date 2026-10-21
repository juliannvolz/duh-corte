/**
 * Testa o botao de login social (producao ou local).
 *   node scripts/qa-login.mjs
 *
 * Verifica:
 *  - se o botao do provedor aparece na tela /entrar;
 *  - se o clique leva ao provedor (accounts.google.com / appleid / facebook);
 *  - se o callback volta para o site (sem erro de configuracao).
 */
import { chromium } from "playwright-core";

const BASE = process.env.QA_BASE ?? "https://duh-corte.vercel.app";
const BRAVE =
  process.env.BRAVE_PATH ??
  "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const PROVEDORES = [
  { nome: "Google", url: /accounts\.google\.com|google\.com\/signin/ },
  { nome: "Apple", url: /appleid\.apple\.com/ },
  { nome: "Facebook", url: /facebook\.com.*\/login|facebook\.com\/dialog/ },
];

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

for (const provedor of PROVEDORES) {
  const botao = page.getByRole("button", { name: new RegExp(`Entrar com ${provedor.nome}`, "i") });
  const aparece = (await botao.count()) > 0;

  if (!aparece) {
    console.log(`${provedor.nome}: botao NAO aparece (credenciais nao configuradas)`);
    continue;
  }

  let chegouNoProvedor = false;
  let erroDeConfig = "";
  try {
    await Promise.all([
      page.waitForURL(provedor.url, { timeout: 20000 }),
      botao.click(),
    ]);
    chegouNoProvedor = true;
  } catch (e) {
    const url = page.url();
    erroDeConfig = url.includes("error=") ? decodeURIComponent(url) : e.message.slice(0, 120);
  }

  console.log(
    `${provedor.nome}: botao visivel | chegou no provedor: ${chegouNoProvedor} | ${erroDeConfig}`,
  );
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
}

await browser.close();
