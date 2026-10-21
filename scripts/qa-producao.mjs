import { chromium } from "playwright-core";

const BASE = process.env.QA_BASE ?? "https://duh-corte.vercel.app";
const SENHA = process.env.ADMIN_PASSWORD ?? "duh-corte-8a4bdaac";
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

console.log("== plano -> agenda ==");
await page.goto(`${BASE}/planos`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: /quero este plano/i }).first().click();
await page.waitForTimeout(2500);
console.log("url:", page.url());
console.log("contexto do plano:", await page.getByText(/selecionado/i).first().isVisible().catch(() => false));

console.log("== admin (producao) ==");
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.getByPlaceholder("••••••••").fill(SENHA);
await page.getByRole("button", { name: /entrar/i }).click();
await page.waitForTimeout(3000);
console.log("botao Sair (logado):", (await page.getByRole("button", { name: /sair/i }).count()) > 0);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
await page.screenshot({ path: "qa/screens/prod-admin-final.png" });

console.log("erros console:", erros.length ? erros.join(" | ") : "nenhum");
console.log("erros http:", httpErros.length ? httpErros.join(" | ") : "nenhum");
await browser.close();
