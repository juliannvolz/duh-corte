/**
 * QA visual e funcional com Brave (Chromium) via playwright-core.
 *
 *  - 3 breakpoints: 390 (mobile), 768 (tablet), 1440 (desktop)
 *  - coleta erros de console, requests falhos e status HTTP
 *  - testa o fluxo de agendamento de ponta a ponta
 *  - testa login e painel admin
 *
 *   node scripts/qa.mjs
 */
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BRAVE = "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "qa");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, dpr: 3 },
  { name: "tablet", width: 768, height: 1024, dpr: 2 },
  { name: "desktop", width: 1440, height: 900, dpr: 1 },
];

const PAGES = ["/", "/servicos", "/planos", "/agendar", "/local", "/privacidade"];

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
    if (url.includes("favicon")) return;
    if (url.includes("google.com/maps/vt")) return;
    if (url.includes("_rsc=")) return;
    bucket.failedRequests.push(`${request.method()} ${url} :: ${request.failure()?.errorText ?? "?"}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && !response.url().includes("/favicon.ico")) {
      bucket.httpErrors.push(`${status} ${response.url()}`);
    }
  });
}

async function run() {
  await mkdir(path.join(OUT, "screens"), { recursive: true });
  const browser = await chromium.launch({
    executablePath: BRAVE,
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const report = { base: BASE, startedAt: new Date().toISOString(), viewports: {}, flow: {}, admin: {} };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      reducedMotion: "no-preference",
    });
    const bucket = { consoleErrors: [], pageErrors: [], failedRequests: [], httpErrors: [], warnings: [] };

    for (const route of PAGES) {
      const page = await context.newPage();
      attachDiagnostics(page, bucket);
      const response = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(800);
      // percorre a pagina para disparar os reveals de whileInView antes do fullPage
      await page.evaluate(async () => {
        const step = Math.round(window.innerHeight * 0.8);
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 220));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1400);
      const shot = `${vp.name}${route === "/" ? "-home" : route.replace(/\//g, "-")}.png`;
      await page.screenshot({ path: path.join(OUT, "screens", shot), fullPage: route !== "/" });
      if (route === "/") {
        await page.screenshot({ path: path.join(OUT, "screens", `${vp.name}-hero.png`), fullPage: false });
      }
      report.viewports[`${vp.name}${route}`] = {
        status: response?.status() ?? null,
        title: await page.title(),
        shot,
      };
      await page.close();
    }

    report.viewports[`${vp.name}-diagnostics`] = bucket;
    await context.close();
  }

  /* ---------------- fluxo de agendamento (desktop) ---------------- */
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  const page = await context.newPage();
  const flowBucket = { consoleErrors: [], pageErrors: [], failedRequests: [], httpErrors: [], warnings: [] };
  attachDiagnostics(page, flowBucket);

  try {
    await page.goto(`${BASE}/agendar`, { waitUntil: "networkidle" });
    // espera a hidratacao do wizard (o botao Continuar nasce desabilitado)
    await page.getByRole("button", { name: /continuar/i }).waitFor({ state: "visible" });
    await page.waitForTimeout(600);

    // passo 1 — escolhe um servico pelo nome
    const serviceButton = page.getByRole("button", { name: /corte degrad/i }).first();
    await serviceButton.waitFor({ state: "visible" });
    await serviceButton.click();
    await page.waitForTimeout(300);
    const pressed = await serviceButton.getAttribute("aria-pressed");
    await page.screenshot({ path: path.join(OUT, "screens", "flow-1-servico.png") });

    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByRole("heading", { name: /com quem/i }).waitFor({ state: "visible" });
    await page.waitForTimeout(400);

    // passo 2 — profissional
    const proButton = page.getByRole("button", { name: /dudu/i }).first();
    await proButton.click();
    await page.getByRole("button", { name: /continuar/i }).click();

    // passo 3 — espera a resposta dos slots do dia
    await page.waitForResponse((res) => res.url().includes("/api/slots"), { timeout: 30000 });
    await page.waitForTimeout(600);

    // escolhe o primeiro dia futuro habilitado (nao esgota a agenda de hoje a cada execucao)
    const chips = page.locator("div.no-scrollbar button");
    const chipCount = await chips.count();
    for (let i = 1; i < chipCount; i++) {
      const chip = chips.nth(i);
      if (await chip.isDisabled()) continue;
      const nextDay = page.waitForResponse((res) => res.url().includes("/api/slots"), { timeout: 30000 });
      await chip.click();
      await nextDay;
      break;
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, "screens", "flow-2-horario.png") });

    const slotButtons = page.getByRole("button", { name: /^\d{2}:\d{2}$/ });
    const slotCount = await slotButtons.count();
    const slotButton = slotButtons.first();
    let success = false;
    let pagamentoPresencial = false;
    let icsOk = false;

    if (slotCount > 0) {
      await slotButton.click();
      await page.getByRole("button", { name: /continuar/i }).click();
      await page.waitForTimeout(500);

      await page.getByPlaceholder("Como te chamamos?").fill("Cliente QA");
      await page.getByPlaceholder("(47) 99999-9999").fill("47999990000");
      await page.screenshot({ path: path.join(OUT, "screens", "flow-3-dados.png") });

      await page.getByRole("button", { name: /confirmar reserva/i }).click();
      await page.getByText(/reserva feita/i).waitFor({ state: "visible", timeout: 20000 });
      success = true;

      // pagamento presencial (sem cobranca online) e link de agenda
      pagamentoPresencial = await page
        .getByText(/pagamento .* na barbearia/i)
        .first()
        .isVisible()
        .catch(() => false);
      const linkAgenda = await page
        .getByRole("link", { name: /adicionar .* agenda/i })
        .first()
        .getAttribute("href")
        .catch(() => null);
      if (linkAgenda) {
        const url = linkAgenda.startsWith("http") ? linkAgenda : `${BASE}${linkAgenda}`;
        const res = await page.request.get(url);
        icsOk = res.ok() && (res.headers()["content-type"] ?? "").includes("text/calendar");
      }
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, "screens", "flow-4-sucesso.png"), fullPage: true });
    }

    report.flow = {
      servicePressed: pressed === "true",
      choseSlot: slotCount > 0,
      slotCount,
      success,
      pagamentoPresencial,
      googleAgenda: icsOk,
      ...flowBucket,
    };
  } catch (error) {
    report.flow = { error: error.message, ...flowBucket };
    await page.screenshot({ path: path.join(OUT, "screens", "flow-erro.png"), fullPage: true }).catch(() => {});
  }

  /* ---------------- admin ---------------- */
  const adminPage = await context.newPage();
  attachDiagnostics(adminPage, flowBucket);
  try {
    await adminPage.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await adminPage.screenshot({ path: path.join(OUT, "screens", "admin-login.png") });
    await adminPage.getByPlaceholder("••••••••").fill(process.env.ADMIN_PASSWORD ?? "duhcorte");
    await adminPage.getByRole("button", { name: /entrar/i }).click();
    await adminPage.waitForTimeout(2500);
    const logged = await adminPage.getByText(/agenda do dia/i).count();
    await adminPage.screenshot({ path: path.join(OUT, "screens", "admin-dashboard.png"), fullPage: true });
    report.admin = { loggedIn: logged > 0 };
  } catch (error) {
    report.admin = { error: error.message };
  }

  await context.close();
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => {
  console.error("QA falhou:", error);
  process.exit(1);
});
