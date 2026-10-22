import { chromium } from "playwright-core";

const BASE = process.env.QA_BASE ?? "https://duh-corte.vercel.app";
const SENHA = process.env.ADMIN_PASSWORD ?? "admin";
const BRAVE =
  process.env.BRAVE_PATH ??
  "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "pt-BR" });
const page = await ctx.newPage();
const erros = [];
const httpErros = [];
page.on("console", (m) => {
  if (m.type() === "error") erros.push(m.text().slice(0, 120));
});
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("favicon.ico")) httpErros.push(`${r.status()} ${r.url()}`);
});

console.log("== rotas ==");
for (const r of ["/", "/servicos", "/planos", "/agendar", "/local", "/privacidade", "/entrar", "/minha-conta", "/admin"]) {
  const res = await page.goto(`${BASE}${r}`, { waitUntil: "networkidle" });
  console.log(r.padEnd(14), res.status());
}

console.log("== agenda (producao) ==");
const slots = await page.request.get(`${BASE}/api/slots?service=corte-degrade&date=2026-10-27`);
const body = await slots.json();
console.log("slots:", slots.status(), (body.slots ?? []).length, "horarios");

const falhas = [];

console.log("== plano -> agenda ==");
await page.goto(`${BASE}/planos`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: /quero este plano/i }).first().click();
await page.waitForURL(/\/agendar\?plano=/, { timeout: 15000 }).catch(() => {});
const contextoPlano = await page
  .getByText(/selecionado/i)
  .first()
  .waitFor({ state: "visible", timeout: 15000 })
  .then(() => true)
  .catch(() => false);
console.log("url:", page.url());
console.log("contexto do plano:", contextoPlano);
if (!contextoPlano) falhas.push("contexto do plano nao apareceu em /agendar");

console.log("== admin (producao) ==");
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.getByPlaceholder("••••••••").fill(SENHA);
await page.getByRole("button", { name: /entrar/i }).click();
await page.waitForTimeout(3000);
const logado = (await page.getByRole("button", { name: /sair/i }).count()) > 0;
console.log("botao Sair (logado):", logado);
if (!logado) falhas.push("login com senha nao abriu o painel");

// painel novo: 3 abas + visao de semana (somente leitura, nao cria dados)
const abas = await page.getByRole("tab").count();
console.log("abas do painel:", abas);
if (abas < 3) falhas.push(`esperava 3 abas, encontrei ${abas}`);

const clientesOk = await page
  .getByRole("tab", { name: /clientes/i })
  .click()
  .then(() => page.getByText(/clientes/i).first().isVisible())
  .catch(() => false);
console.log("aba Clientes:", clientesOk);
if (!clientesOk) falhas.push("aba Clientes nao abriu");

const avaliacoesOk = await page
  .getByRole("tab", { name: /avalia/i })
  .click()
  .then(() => page.getByText(/avalia/i).first().isVisible())
  .catch(() => false);
console.log("aba Avaliacoes:", avaliacoesOk);
if (!avaliacoesOk) falhas.push("aba Avaliacoes nao abriu");

await page.getByRole("tab", { name: /agenda/i }).click();
const semanaOk = await page
  .getByRole("button", { name: /semana/i })
  .first()
  .click()
  .then(() => page.waitForTimeout(2500))
  .then(() => page.getByText(/seg|ter|qua|qui|sex|sab|dom/i).first().isVisible())
  .catch(() => false);
console.log("visao Semana:", semanaOk);
if (!semanaOk) falhas.push("visao de semana nao renderizou");

await page.screenshot({ path: "qa/screens/prod-admin-final.png", fullPage: false });

console.log("erros console:", erros.length ? erros.join(" | ") : "nenhum");
console.log("erros http:", httpErros.length ? httpErros.join(" | ") : "nenhum");
console.log(falhas.length === 0 && erros.length === 0 && httpErros.length === 0 ? "RESULTADO: PASS" : `RESULTADO: FAIL (${falhas.join("; ")})`);
await browser.close();
process.exit(falhas.length === 0 && erros.length === 0 && httpErros.length === 0 ? 0 : 1);
