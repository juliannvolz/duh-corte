/**
 * QA das telas novas: login social, area do cliente, plano na agenda e
 * integracao com a agenda do Google (status no painel).
 *   node scripts/qa-novas-telas.mjs
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const BRAVE =
  process.env.BRAVE_PATH ??
  "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const OUT = path.resolve(import.meta.dirname, "..", "qa", "screens");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "pt-BR" });
const page = await ctx.newPage();

const erros = [];
const httpErros = [];
page.on("console", (m) => {
  if (m.type() === "error") erros.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("favicon.ico")) {
    httpErros.push(`${r.status()} ${r.url()}`);
  }
});

const relatorio = {};

// 1) /entrar
await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, "entrar.png") });
relatorio.entrar = {
  temBotaoEntrar: await page.getByText(/entrar/i).first().isVisible().catch(() => false),
  temSenhaAdmin: await page.getByText(/senha da barbearia/i).isVisible().catch(() => false),
};

// 2) /minha-conta sem sessao
await page.goto(`${BASE}/minha-conta`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: path.join(OUT, "minha-conta.png") });
relatorio.minhaConta = {
  redirecionaParaEntrar: await page
    .getByText(/entre para ver seus hor/i)
    .first()
    .isVisible()
    .catch(() => false),
};

// 3) /agendar?plano= (contexto do Clube)
await page.goto(`${BASE}/planos`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, "planos-botoes.png") });
const botaoPlano = page.getByRole("link", { name: /quero este plano/i }).first();
relatorio.planos = {
  temBotao: await botaoPlano.isVisible().catch(() => false),
  temAtivarLoja: await page
    .getByText(/ativar na loja/i)
    .first()
    .isVisible()
    .catch(() => false),
};
await botaoPlano.click();
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(OUT, "agendar-plano.png") });
relatorio.planos.contextoNaAgenda = await page
  .getByText(/selecionado/i)
  .first()
  .isVisible()
  .catch(() => false);
relatorio.planos.url = page.url();

// 4) painel: card de integracoes com o passo a passo
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.getByLabel(/senha/i).fill(process.env.ADMIN_PASSWORD ?? "duhcorte");
await page.getByRole("button", { name: /entrar/i }).click();
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, "admin-integracoes.png") });
relatorio.admin = {
  temCardIntegracoes: await page
    .getByText(/sua agenda do google/i)
    .first()
    .isVisible()
    .catch(() => false),
  temCardFidelidade: await page
    .getByText(/fidelidade/i)
    .first()
    .isVisible()
    .catch(() => false),
};

relatorio.erros = erros;
relatorio.httpErros = httpErros;

await writeFile(
  path.join(OUT, "..", "report-novas-telas.json"),
  JSON.stringify(relatorio, null, 2),
  "utf8",
);
console.log(JSON.stringify(relatorio, null, 2));

await browser.close();
