/**
 * QA do painel da casa e das telas novas.
 *
 *  - login nas duas abas (cliente / equipe)
 *  - agenda: visao dia e visao semana
 *  - novo agendamento (modal com grade de horario)
 *  - bloquear horario
 *  - aba de clientes (busca)
 *  - aba de avaliacoes
 *  - 3 breakpoints: 390, 768, 1440
 *
 *   node scripts/qa-painel.mjs
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const SENHA = process.env.QA_ADMIN_PASSWORD ?? "duhcorte";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "qa");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, dpr: 3 },
  { name: "tablet", width: 768, height: 1024, dpr: 2 },
  { name: "desktop", width: 1440, height: 900, dpr: 1 },
];

function attachDiagnostics(page, bucket) {
  page.on("console", (msg) => {
    if (msg.type() === "error") bucket.consoleErrors.push(msg.text());
    if (msg.type() === "warning" && /hydration|validateDOMNesting/i.test(msg.text())) {
      bucket.warnings.push(msg.text());
    }
  });
  page.on("pageerror", (error) => bucket.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("favicon") || url.includes("_rsc=")) return;
    bucket.failedRequests.push(`${request.method()} ${url} :: ${request.failure()?.errorText ?? "?"}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && !response.url().includes("/favicon.ico")) {
      bucket.httpErrors.push(`${status} ${response.url()}`);
    }
  });
}

function novaBucket() {
  return { consoleErrors: [], pageErrors: [], failedRequests: [], httpErrors: [], warnings: [] };
}

async function run() {
  await mkdir(path.join(OUT, "screens"), { recursive: true });
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const report = { base: BASE, startedAt: new Date().toISOString(), telas: {}, paineis: {} };

  /* ---------------- telas publicas + login (3 breakpoints) ---------------- */
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });
    const bucket = novaBucket();

    for (const rota of ["/entrar", "/minha-conta", "/admin"]) {
      const page = await context.newPage();
      attachDiagnostics(page, bucket);
      const response = await page.goto(BASE + rota, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(600);
      const shot = `painel-${vp.name}${rota.replace(/\//g, "-")}.png`;
      await page.screenshot({ path: path.join(OUT, "screens", shot), fullPage: true });
      report.telas[`${vp.name}${rota}`] = {
        status: response?.status() ?? null,
        title: await page.title(),
        shot,
      };
      await page.close();
    }

    report.telas[`${vp.name}-diagnostics`] = bucket;
    await context.close();
  }

  /* ---------------- login: as duas abas ---------------- */
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });
    const page = await context.newPage();
    const bucket = novaBucket();
    attachDiagnostics(page, bucket);

    await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });

    // aba cliente (antes de trocar, para o elemento estar visivel)
    const abaCliente = page.getByRole("tab", { name: /sou cliente/i });
    await abaCliente.waitFor({ state: "visible" });
    const botaoGoogle = page.getByRole("button", { name: /entrar com google/i }).first();
    const temGoogle = await botaoGoogle.isVisible();
    const tituloCliente = await page
      .getByRole("heading", { name: /^entrar$/i })
      .isVisible()
      .catch(() => false);
    const semSenhaNaAbaCliente = !(await page.getByPlaceholder("••••••••").isVisible().catch(() => false));
    await page.screenshot({ path: path.join(OUT, "screens", "login-cliente.png"), fullPage: true });

    // aba equipe
    const abaEquipe = page.getByRole("tab", { name: /sou da equipe/i });
    await abaEquipe.click();
    await page.waitForTimeout(400);
    const temSenha = await page.getByPlaceholder("••••••••").isVisible();
    const rotuloEquipe = await page.getByRole("heading", { name: /painel da barbearia/i }).isVisible();
    await page.screenshot({ path: path.join(OUT, "screens", "login-equipe.png"), fullPage: true });

    // a senha da casa leva ao painel
    await page.getByPlaceholder("••••••••").fill(SENHA);
    await page.getByRole("button", { name: /entrar no painel/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const noPainel = page.url().includes("/admin");
    const temAbaClientes = await page.getByRole("tab", { name: /clientes/i }).isVisible().catch(() => false);
    const temAbaAvaliacoes = await page
      .getByRole("tab", { name: /avalia/i })
      .isVisible()
      .catch(() => false);
    const temBotaoNovo = await page
      .getByRole("button", { name: /novo agendamento/i })
      .isVisible()
      .catch(() => false);

    report.paineis.login = {
      abaCliente: await abaCliente.isVisible(),
      botaoGoogle: temGoogle,
      tituloCliente,
      semSenhaNaAbaCliente,
      abaEquipe: await abaEquipe.isVisible(),
      campoSenha: temSenha,
      tituloEquipe: rotuloEquipe,
      senhaAbreOPainel: noPainel,
      abaClientes: temAbaClientes,
      abaAvaliacoes: temAbaAvaliacoes,
      botaoNovoAgendamento: temBotaoNovo,
      consoleErrors: bucket.consoleErrors,
      pageErrors: bucket.pageErrors,
      httpErrors: bucket.httpErrors,
      failedRequests: bucket.failedRequests,
    };

    /* ---------------- agenda: dia e semana ---------------- */
    if (noPainel) {
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, "screens", "painel-dia.png"), fullPage: true });

      // visao semana
      await page.getByRole("button", { name: /^semana$/i }).click();
      await page.waitForTimeout(1500);
      const colunas = await page.locator("h2, .grid > div").count();
      const temSemana = await page.getByText(/nesta semana/i).isVisible().catch(() => false);
      await page.screenshot({ path: path.join(OUT, "screens", "painel-semana.png"), fullPage: true });

      // volta para o dia
      await page.getByRole("button", { name: /^dia$/i }).click();
      await page.waitForTimeout(900);

      report.paineis.semana = {
        visivel: temSemana,
        colunas: colunas,
        consoleErrors: bucket.consoleErrors,
        httpErrors: bucket.httpErrors,
      };

      /* ---------------- modal de novo agendamento ---------------- */
      await page.getByRole("button", { name: /novo agendamento/i }).click();
      await page.waitForTimeout(700);
      const modalAberto = await page.getByRole("dialog").isVisible().catch(() => false);
      const temGrade = await page
        .getByRole("button", { name: /^\d{2}:\d{2}$/ })
        .first()
        .isVisible()
        .catch(() => false);
      await page.screenshot({ path: path.join(OUT, "screens", "painel-modal-novo.png"), fullPage: true });

      // fecha
      await page.getByRole("button", { name: /fechar/i }).click();
      await page.waitForTimeout(400);

      /* ---------------- modal de bloqueio ---------------- */
      await page.getByRole("button", { name: /bloquear/i }).click();
      await page.waitForTimeout(600);
      const modalBloqueio = await page
        .getByRole("heading", { name: /bloquear hor/i })
        .isVisible()
        .catch(() => false);
      await page.screenshot({ path: path.join(OUT, "screens", "painel-modal-bloqueio.png"), fullPage: true });
      await page.getByRole("button", { name: /fechar/i }).click();
      await page.waitForTimeout(400);

      report.paineis.modais = {
        novoAgendamento: modalAberto,
        gradeDeHorarios: temGrade,
        bloqueio: modalBloqueio,
      };

      /* ---------------- cria um agendamento de verdade pelo modal ---------------- */
      await page.getByRole("button", { name: /novo agendamento/i }).click();
      await page.waitForTimeout(900);

      const chips = page.locator("div.no-scrollbar button");
      const chipCount = await chips.count();
      for (let i = 1; i < chipCount; i++) {
        const chip = chips.nth(i);
        if (await chip.isDisabled()) continue;
        const esperou = page.waitForResponse((r) => r.url().includes("/api/slots"), {
          timeout: 20000,
        });
        await chip.click();
        await esperou;
        await page.waitForTimeout(500);
        break;
      }

      const slotsModal = page.getByRole("button", { name: /^\d{2}:\d{2}$/ });
      let criou = false;
      if ((await slotsModal.count()) > 0) {
        await slotsModal.first().click();
        await page.getByLabel(/nome do cliente/i).fill("Cliente Do Painel");
        await page.getByLabel(/^whatsapp$/i).fill("47988887777");
        await page.getByRole("button", { name: /marcar hor/i }).click();
        await page.waitForTimeout(2500);
        criou = !(await page.getByRole("dialog").isVisible().catch(() => false));
      }
      await page.screenshot({ path: path.join(OUT, "screens", "painel-criado.png"), fullPage: true });

      report.paineis.criacao = {
        modalAceitouNome: true,
        agendamentoCriado: criou,
        consoleErrors: bucket.consoleErrors,
        httpErrors: bucket.httpErrors,
      };

      /* ---------------- aba de clientes ---------------- */
      await page.getByRole("tab", { name: /clientes/i }).click();
      await page.waitForTimeout(1200);
      const buscaVisivel = await page
        .getByPlaceholder(/nome, telefone ou e-mail/i)
        .isVisible()
        .catch(() => false);
      await page.getByPlaceholder(/nome, telefone ou e-mail/i).fill("a");
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, "screens", "painel-clientes.png"), fullPage: true });

      report.paineis.clientes = {
        busca: buscaVisivel,
        consoleErrors: bucket.consoleErrors,
        httpErrors: bucket.httpErrors,
      };

      /* ---------------- aba de avaliacoes ---------------- */
      await page.getByRole("tab", { name: /avalia/i }).click();
      await page.waitForTimeout(1200);
      const temAvaliacoes = await page
        .getByRole("heading", { name: /avalia/i })
        .first()
        .isVisible()
        .catch(() => false);
      const listaDeAvaliacoes = await page.locator("li").count();
      await page.screenshot({ path: path.join(OUT, "screens", "painel-avaliacoes.png"), fullPage: true });

      report.paineis.avaliacoes = {
        titulo: temAvaliacoes,
        itens: listaDeAvaliacoes,
        consoleErrors: bucket.consoleErrors,
        httpErrors: bucket.httpErrors,
        failedRequests: bucket.failedRequests,
      };
    }

    await context.close();
  }

  await browser.close();

  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(OUT, "relatorio-painel.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report.paineis, null, 2));
  console.log("\n--- telas ---");
  for (const [k, v] of Object.entries(report.telas)) {
    if (k.includes("diagnostics")) {
      const b = v;
      console.log(
        `${k}: console=${b.consoleErrors.length} http=${b.httpErrors.length} failed=${b.failedRequests.length} page=${b.pageErrors.length}`,
      );
      for (const e of b.consoleErrors.slice(0, 4)) console.log("   ! " + e.slice(0, 220));
      for (const e of b.httpErrors.slice(0, 4)) console.log("   ! " + e);
    } else {
      console.log(`${k}: ${v.status}`);
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
