/**
 * Teste E2E do programa de fidelidade:
 *   1. cria uma reserva pela API publica;
 *   2. marca como "atendido" no painel (admin);
 *   3. confere os pontos creditados e a recompensa liberada.
 *   node scripts/qa-loyalty.mjs
 */
import { chromium } from "playwright-core";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const SENHA = process.env.ADMIN_PASSWORD ?? "duhcorte";

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// 1) login no painel
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await page.getByLabel(/senha/i).fill(SENHA);
await page.getByRole("button", { name: /entrar/i }).click();
await page.waitForTimeout(1500);

// 2) cria uma reserva pela API publica (mesmo caminho do site)
const services = await (await page.request.get(`${BASE}/api/services`)).json();
const service = services.services.find((s) => s.name.includes("Degrad")) ?? services.services[0];
const professional = { id: "dudu" }; // profissional padrao da casa

// procura o proximo dia util com horario livre
let dataISO = "";
let slot = null;
for (let d = 1; d <= 8 && !slot; d += 1) {
  const dia = new Date(Date.now() + 3 * 3600_000 + d * 86400_000);
  const iso = dia.toISOString().slice(0, 10);
  const r = await (
    await page.request.get(
      `${BASE}/api/slots?service=${service.id}&professional=${professional.id}&date=${iso}`,
    )
  ).json();
  if (r.slots?.length) {
    dataISO = iso;
    slot = r.slots[0];
  }
}
if (!slot) throw new Error("sem horario livre nos proximos dias");
if (!slot) throw new Error("sem horario livre para o teste");

const tel = `47999${Math.floor(1000000 + Math.random() * 8999999)}`;
const reserva = await (
  await page.request.post(`${BASE}/api/appointments`, {
    data: {
      serviceId: service.id,
      professionalId: professional.id,
      startsAt: slot.startsAt,
      idempotencyKey: `qa-loy-${Date.now()}`,
      customer: { name: "Cliente Fidelidade", phone: tel },
    },
  })
).json();

console.log("reserva:", reserva.id, "| pontos antes:", reserva.loyalty?.points, "| codigo:", reserva.loyalty?.referralCode);

// 3) marca como atendido
const patch = await (
  await page.request.patch(`${BASE}/api/admin/appointments`, {
    data: { id: reserva.id, status: "done" },
  })
).json();
console.log("patch:", JSON.stringify(patch));

// 4) confere o painel de fidelidade
const loyalty = await (await page.request.get(`${BASE}/api/admin/loyalty`)).json();
const cliente = loyalty.clientes.find((c) => c.phone === tel);
console.log("cliente no programa:", JSON.stringify(cliente));
console.log("recompensas:", loyalty.rewards.filter((r) => r.customer.phone === tel).map((r) => `${r.label} (${r.status})`));
console.log("pontos em circulacao:", loyalty.pontosEmCirculacao);

await browser.close();
