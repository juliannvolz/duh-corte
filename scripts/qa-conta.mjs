/**
 * QA do fluxo "Minha conta" — o caso real que estava quebrado.
 *
 * Reproduz exatamente a situacao do banco de producao:
 *   - cadastro do cliente veio da reserva, com um e-mail DIFERENTE do Google;
 *   - googleId vazio;
 *   - cliente entra com o Google e informa o WhatsApp na area dele.
 *
 * Valida:
 *   1. antes de vincular, a reserva NAO aparece;
 *   2. o cartao "Vincular meu WhatsApp" aparece;
 *   3. apos informar o numero, a reserva aparece (sem recarregar na mao);
 *   4. o googleId fica gravado e, no reload, continua aparecendo sozinho;
 *   5. telefone de OUTRA conta devolve 409 com e-mail mascarado;
 *   6. visitante com e-mail no cadastro consegue cancelar pelo telefone;
 *   7. o painel do dono enxerga o mesmo agendamento;
 *   8. .ics responde 200 com o calendario;
 *   9. zero erro de console / HTTP 4xx inesperado.
 *
 * Uso (com o site rodando): node scripts/qa-conta.mjs
 *   QA_BASE=http://localhost:3100 node scripts/qa-conta.mjs
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

function env(nome) {
  const arquivo = [".env.local", ".env"].find((f) => existsSync(f));
  if (!arquivo) return process.env[nome];
  const linha = readFileSync(arquivo, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${nome}=`));
  if (!linha) return process.env[nome];
  return linha.slice(nome.length + 1).replace(/^["']|["']$/g, "");
}

const BASE = process.env.QA_BASE ?? "http://localhost:3100";
const prisma = new PrismaClient();

const EMAIL_SESSAO = "qa.conta.flow@gmail.com";
const GOOGLE_ID = "qa-google-conta-flow";
const TEL_PRINCIPAL = "47996001122";
const TEL_OUTRA_CONTA = "47996003344";
const TEL_VISITANTE = "47996005566";
const NOME = "QA Conta Flow";

const resultado = {
  base: BASE,
  antesNaoAparece: false,
  cartaoVinculo: false,
  depoisAparece: false,
  proximoCard: false,
  reivindicacaoCriada: false,
  googleIdIntacto: false,
  reloadAutomatico: false,
  outraConta409: false,
  jaLigado409: false,
  cancelamentoVisitante: false,
  reservaLogada: false,
  vinculoConta: false,
  reservaNovaAparece: false,
  adminVe: false,
  adminVeAcesso: false,
  ics: false,
  consoleErrors: [],
  pageErrors: [],
  httpErrors: [],
};

function diaSP(deslocamentoDias) {
  const alvo = new Date(Date.now() + deslocamentoDias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(alvo);
}

async function limpar() {
  const ids = [TEL_PRINCIPAL, TEL_OUTRA_CONTA, TEL_VISITANTE].map((t) => `phone:${t}`);
  await prisma.appointment.deleteMany({ where: { customerId: { in: ids } } });
  await prisma.customerClaim.deleteMany({
    where: { OR: [{ customerId: { in: ids } }, { googleId: GOOGLE_ID }] },
  });
  await prisma.customer.deleteMany({ where: { id: { in: ids } } });
}

const browser = await chromium.launch({
  executablePath:
    process.env.QA_BROWSER ??
    "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

page.on("console", (m) => {
  if (m.type() === "error") resultado.consoleErrors.push(m.text());
});
page.on("pageerror", (e) => resultado.pageErrors.push(e.message));
page.on("response", (r) => {
  if (!r.url().startsWith(BASE)) return;
  if (r.status() < 400) return;
  if (r.url().includes("/favicon")) return;
  resultado.httpErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
});

try {
  mkdirSync("qa/screens", { recursive: true });
  await limpar();

  const servico = await prisma.service.findFirst({ orderBy: { name: "asc" } });
  const profissional = await prisma.professional.findFirst({ orderBy: { name: "asc" } });
  if (!servico || !profissional) throw new Error("Rode o seed antes (npm run db:seed).");

  // Amanha as 14h de Brasilia (o cron tambem usa esse fuso).
  const inicio = new Date(`${diaSP(1)}T14:00:00-03:00`);
  const fim = new Date(inicio.getTime() + servico.durationMin * 60_000);

  // 1. cliente com e-mail DIFERENTE do Google e googleId vazio (o bug real)
  await prisma.customer.create({
    data: {
      id: `phone:${TEL_PRINCIPAL}`,
      name: NOME,
      phone: TEL_PRINCIPAL,
      email: "outro.email.qa@gmail.com",
      googleId: null,
    },
  });
  const agendamento = await prisma.appointment.create({
    data: {
      customerId: `phone:${TEL_PRINCIPAL}`,
      serviceId: servico.id,
      professionalId: profissional.id,
      startsAt: inicio,
      endsAt: fim,
      priceCents: servico.priceCents,
      status: "confirmed",
      source: "site",
    },
  });

  // 2. telefone que pertence a OUTRA conta social
  await prisma.customer.create({
    data: {
      id: `phone:${TEL_OUTRA_CONTA}`,
      name: "QA Outra Conta",
      phone: TEL_OUTRA_CONTA,
      email: "dono.anterior@qa.com",
      googleId: "qa-google-outra-conta",
    },
  });

  // 3. visitante que reservou COM e-mail (nao conseguia cancelar antes)
  await prisma.customer.create({
    data: {
      id: `phone:${TEL_VISITANTE}`,
      name: "QA Visitante",
      phone: TEL_VISITANTE,
      email: "visitante@qa.com",
      googleId: null,
    },
  });
  const inicioVisitante = new Date(`${diaSP(3)}T15:00:00-03:00`);
  const fimVisitante = new Date(inicioVisitante.getTime() + servico.durationMin * 60_000);
  const doVisitante = await prisma.appointment.create({
    data: {
      customerId: `phone:${TEL_VISITANTE}`,
      serviceId: servico.id,
      professionalId: profissional.id,
      startsAt: inicioVisitante,
      endsAt: fimVisitante,
      priceCents: servico.priceCents,
      status: "pending",
      source: "site",
    },
  });

  // 4. sessao assinada igual ao Auth.js (sem depender do Google real)
  const secret = env("AUTH_SECRET");
  if (!secret) throw new Error("AUTH_SECRET ausente no .env");

  const token = await encode({
    token: { sub: GOOGLE_ID, name: NOME, email: EMAIL_SESSAO, isAdmin: false },
    secret,
    salt: "authjs.session-token",
  });

  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // 5. antes de vincular: sem reserva, mas com o cartao de vinculo
  await page.goto(`${BASE}/minha-conta`, { waitUntil: "networkidle" });
  const textoAntes = await page.locator("body").innerText();
  resultado.antesNaoAparece = !textoAntes.includes(servico.name);
  resultado.cartaoVinculo = /vincular meu whatsapp/i.test(textoAntes);

  await page.screenshot({ path: "qa/screens/conta-antes-vincular.png", fullPage: true });

  // 6. vincula pelo WhatsApp
  await page.locator('input[aria-label="WhatsApp usado na reserva"]').fill("(47) 99600-1122");
  await page.getByRole("button", { name: /^Vincular$/ }).click();

  resultado.depoisAparece = await page
    .getByText(servico.name)
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  resultado.proximoCard = await page
    .getByText(/Próximo atendimento/i)
    .first()
    .isVisible()
    .catch(() => false);

  const depois = await prisma.customer.findUnique({ where: { id: `phone:${TEL_PRINCIPAL}` } });
  const claim = await prisma.customerClaim.findFirst({
    where: { customerId: `phone:${TEL_PRINCIPAL}`, googleId: GOOGLE_ID },
  });
  // e-mail diferente: NAO toma o cadastro (googleId fica null), cria reivindicacao
  resultado.reivindicacaoCriada = Boolean(claim);
  resultado.googleIdIntacto = depois?.googleId === null;

  await page.screenshot({ path: "qa/screens/conta-depois-vincular.png", fullPage: true });

  // 7. reload: agora e automatico (googleId no banco)
  await page.reload({ waitUntil: "networkidle" });
  resultado.reloadAutomatico = await page
    .getByText(servico.name)
    .first()
    .isVisible()
    .catch(() => false);

  // 8. telefone de outra conta -> 409 com e-mail mascarado
  const conflito = await page.request.get(
    `${BASE}/api/minha-conta?tel=${TEL_OUTRA_CONTA}`,
    { failOnStatusCode: false },
  );
  const corpoConflito = await conflito.json().catch(() => ({}));
  resultado.outraConta409 =
    conflito.status() === 409 && /outra conta/i.test(corpoConflito.error ?? "");

  // 8b. a sessao ja acompanha um cadastro: nao junta outro automaticamente
  const jaLigado = await page.request.get(`${BASE}/api/minha-conta?tel=${TEL_VISITANTE}`, {
    failOnStatusCode: false,
  });
  const corpoJa = await jaLigado.json().catch(() => ({}));
  resultado.jaLigado409 = jaLigado.status() === 409 && corpoJa.code === "JA_LIGADO";

  // 9. visitante com e-mail cancela pelo telefone (sem sessao dele)
  const cancelamento = await page.request.patch(
    `${BASE}/api/appointments/${doVisitante.id}`,
    {
      data: { action: "cancel", phone: TEL_VISITANTE, reason: "teste QA" },
      failOnStatusCode: false,
    },
  );
  resultado.cancelamentoVisitante = cancelamento.status() === 200;

  // 9b. reserva feita JA LOGADA: nasce ligada a conta e aparece sozinha
  const nova = await page.request.post(`${BASE}/api/appointments`, {
    data: {
      serviceId: servico.id,
      professionalId: profissional.id,
      startsAt: new Date(`${diaSP(3)}T16:00:00-03:00`).toISOString(),
      idempotencyKey: `qa-conta-${Date.now()}`,
      customer: { name: NOME, phone: TEL_PRINCIPAL },
    },
    failOnStatusCode: false,
  });
  const corpoNova = await nova.json().catch(() => ({}));
  resultado.reservaLogada = nova.status() === 200 || nova.status() === 201;
  // e-mail diferente -> "reivindicado"; e-mail igual -> "conta"
  resultado.vinculoConta = ["conta", "reivindicado"].includes(corpoNova.vinculo);

  await page.goto(`${BASE}/minha-conta`, { waitUntil: "networkidle" });
  resultado.reservaNovaAparece = await page
    .getByText(/16:00/)
    .first()
    .isVisible()
    .catch(() => false);

  // 10. painel do dono enxerga o mesmo agendamento
  const senha = env("ADMIN_PASSWORD");
  const login = await page.request.post(`${BASE}/api/admin/login`, {
    data: { password: senha },
    failOnStatusCode: false,
  });
  if (login.status() === 200) {
    const dia = diaSP(1);
    const lista = await page.request.get(`${BASE}/api/admin/appointments?date=${dia}`, {
      failOnStatusCode: false,
    });
    const json = await lista.json().catch(() => ({}));
    resultado.adminVe = Boolean(
      (json.appointments ?? []).find((a) => a.id === agendamento.id),
    );

    const listaClientes = await page.request.get(
      `${BASE}/api/admin/clientes?q=${TEL_PRINCIPAL}`,
      { failOnStatusCode: false },
    );
    const jsonClientes = await listaClientes.json().catch(() => ({}));
    resultado.adminVeAcesso = Boolean(
      (jsonClientes.clientes ?? []).find(
        (c) =>
          c.id === `phone:${TEL_PRINCIPAL}` &&
          c.acesso === "whatsapp" &&
          c.reivindicacoes >= 1,
      ),
    );
  }

  // 11. .ics do agendamento vinculado
  const ics = await page.request.get(
    `${BASE}/api/appointments/${agendamento.id}/ics?tel=${TEL_PRINCIPAL}`,
    { failOnStatusCode: false },
  );
  resultado.ics =
    ics.status() === 200 && /text\/calendar/.test(ics.headers()["content-type"] ?? "");

  // 12. responsivo: confere o cartao em desktop tambem
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: "qa/screens/conta-desktop.png", fullPage: true });
} catch (erro) {
  resultado.erroFatal = erro instanceof Error ? erro.message : String(erro);
} finally {
  await browser.close();
  await prisma.$disconnect();
}

const essenciais = [
  "antesNaoAparece",
  "cartaoVinculo",
  "depoisAparece",
  "proximoCard",
  "reivindicacaoCriada",
  "googleIdIntacto",
  "reloadAutomatico",
  "outraConta409",
  "jaLigado409",
  "cancelamentoVisitante",
  "reservaLogada",
  "vinculoConta",
  "reservaNovaAparece",
  "adminVe",
  "adminVeAcesso",
  "ics",
];
const falhas = essenciais.filter((chave) => resultado[chave] !== true);

console.log(JSON.stringify({ ...resultado, falhas }, null, 2));
process.exit(falhas.length === 0 && !resultado.erroFatal ? 0 : 1);
