/**
 * QA visual do formulario de avaliacao do cliente.
 *
 * Cria uma sessao assinada (mesmo segredo do Auth.js) para o cliente de teste,
 * abre /minha-conta e valida o fluxo: estrelas -> comentario -> enviar ->
 * mensagem de obrigado -> "Sua avaliacao: 5 de 5 estrelas".
 *
 * Uso: node scripts/qa-feedback-cliente.mjs
 */
import { readFileSync, existsSync } from "node:fs";
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

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const prisma = new PrismaClient();

const APPOINTMENT_ID = "cmvjnzij70001l1dghzsv9jkk";
const EMAIL = "teste@painel.com";
const GOOGLE_ID = "qa-google-teste-painel";

const resultado = {
  cliente: null,
  sessao: false,
  formulario: false,
  nota: false,
  comentario: false,
  envio: false,
  persistiu: false,
  consoleErrors: [],
  pageErrors: [],
  httpErrors: [],
};

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
  if (r.url().startsWith(BASE) && r.status() >= 400) {
    resultado.httpErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  }
});

try {
  // 1. prepara o cliente de teste (e-mail + googleId batendo com a sessao)
  await prisma.feedback.deleteMany({ where: { appointmentId: APPOINTMENT_ID } });
  const cliente = await prisma.customer.update({
    where: { id: "phone:47999998888" },
    data: { email: EMAIL, googleId: GOOGLE_ID },
  });
  resultado.cliente = cliente.name;

  // 2. assina a sessao igual ao Auth.js
  const secret = env("AUTH_SECRET");
  if (!secret) throw new Error("AUTH_SECRET ausente no .env");

  const token = await encode({
    token: {
      sub: GOOGLE_ID,
      name: cliente.name,
      email: EMAIL,
      isAdmin: false,
    },
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

  // 3. abre a area do cliente
  await page.goto(`${BASE}/minha-conta`, { waitUntil: "networkidle" });
  resultado.sessao = (await page.getByText(cliente.name.split(" ")[0]).count()) > 0;

  const grupo = page.getByRole("radiogroup", { name: /nota de 1 a 5/i });
  resultado.formulario = await grupo.isVisible();

  // 4. avalia
  await page.getByRole("radio", { name: /^5 estrelas/i }).click();
  resultado.nota = true;

  await page
    .getByPlaceholder(/quer contar como foi/i)
    .fill("Atendimento impecável, ambiente top e o corte ficou exato.");
  resultado.comentario = true;

  await page.screenshot({ path: "qa/screens/cliente-avaliacao-form.png", fullPage: false });

  await page.getByRole("button", { name: /enviar avalia/i }).click();

  resultado.envio = await page
    .getByText(/obrigado! sua avalia/i)
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "networkidle" });

  resultado.persistiu = await page
    .getByText(/sua avalia/i)
    .first()
    .isVisible()
    .catch(() => false);

  await page.screenshot({ path: "qa/screens/cliente-avaliacao.png", fullPage: false });
} finally {
  await browser.close();
  await prisma.$disconnect();
}

resultado.passou =
  resultado.sessao &&
  resultado.formulario &&
  resultado.nota &&
  resultado.comentario &&
  resultado.envio &&
  resultado.persistiu &&
  resultado.consoleErrors.length === 0 &&
  resultado.pageErrors.length === 0 &&
  resultado.httpErrors.length === 0;

console.log(JSON.stringify(resultado, null, 2));
process.exit(resultado.passou ? 0 : 1);
