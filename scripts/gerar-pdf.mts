/**
 * Gera PDF (estilo do site) a partir dos entregaveis em Markdown.
 *
 *   npx tsx scripts/gerar-pdf.mts
 *
 * Saida: entregaveis/<nome>.pdf (os .md continuam no lugar).
 * O HTML e impresso pelo Brave headless com CSS proprio (cores do site).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { chromium } from "playwright-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "entregaveis");
const BRAVE =
  process.env.BRAVE_PATH ??
  "C:\\Users\\julia\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

const DOCUMENTOS: Array<{ md: string; titulo: string; subtitulo: string; selo: string }> = [
  {
    md: "TUTORIAL-DONO.md",
    titulo: "Tutorial Duh Corte",
    subtitulo: "Guia do dono da barbearia — passo a passo, sem jargão",
    selo: "GUIA DO DONO",
  },
  {
    md: "TEXTO-CLIENTE.md",
    titulo: "Duh Corte Barbearia",
    subtitulo: "O que foi feito no site — resumo para o cliente",
    selo: "RESUMO DO CLIENTE",
  },
  {
    md: "PROPOSTA-COMERCIAL.md",
    titulo: "Proposta comercial",
    subtitulo: "Duh Corte Barbearia — site, agenda online e painel",
    selo: "PROPOSTA",
  },
];

/** Paleta do site (globals.css). */
const CSS = `
  @page { size: A4; margin: 0; }
  html, body { background: var(--ink) !important; }

  :root {
    --ink: #0a0a0a;
    --ink-2: #121212;
    --ink-3: #1b1b1b;
    --bone: #f2ede4;
    --bone-dim: #b9b2a6;
    --gold: #c8952b;
    --gold-soft: #e0b45c;
    --line: rgba(242, 237, 228, 0.14);
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--ink);
    color: var(--bone);
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 10.6pt;
    line-height: 1.62;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .folha { padding: 13mm 15mm 10mm; }

  .capa {
    border-bottom: 2px solid var(--gold);
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .selo {
    display: inline-block;
    font-size: 7.6pt;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: var(--gold);
    border: 1px solid rgba(200, 149, 43, 0.45);
    border-radius: 999px;
    padding: 4px 12px;
    margin-bottom: 14px;
  }
  .titulo {
    font-family: "Anton", "Arial Narrow", sans-serif;
    text-transform: uppercase;
    font-size: 27pt;
    line-height: 1.02;
    letter-spacing: -0.01em;
    margin: 0 0 6px;
  }
  .subtitulo {
    font-family: "Instrument Serif", Georgia, serif;
    font-style: italic;
    font-size: 13.5pt;
    color: var(--bone-dim);
    margin: 0;
  }
  .rodape-capa {
    display: flex;
    justify-content: space-between;
    font-size: 7.6pt;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(242, 237, 228, 0.45);
    margin-top: 14px;
  }

  h1, h2, h3, h4 {
    font-family: "Anton", "Arial Narrow", sans-serif;
    text-transform: uppercase;
    letter-spacing: -0.005em;
    break-after: avoid;
  }
  h1 { font-size: 16pt; margin: 26px 0 10px; color: var(--bone); }
  h2 {
    font-size: 13.4pt;
    margin: 22px 0 8px;
    color: var(--bone);
    border-left: 3px solid var(--gold);
    padding-left: 9px;
  }
  h3 { font-size: 11.2pt; margin: 16px 0 6px; color: var(--gold-soft); }
  h4 { font-size: 10pt; margin: 13px 0 4px; color: var(--bone-dim); }

  p { margin: 0 0 9px; color: #ddd6ca; }
  strong { color: var(--gold); font-weight: 700; }
  em { color: var(--bone); font-style: italic; }
  a { color: var(--gold); text-decoration: none; }

  ul, ol { margin: 0 0 10px; padding-left: 18px; }
  li { margin-bottom: 4px; color: #ddd6ca; }
  li::marker { color: var(--gold); }

  code {
    font-family: "Consolas", ui-monospace, monospace;
    font-size: 8.8pt;
    background: rgba(200, 149, 43, 0.12);
    border: 1px solid rgba(200, 149, 43, 0.3);
    border-radius: 4px;
    padding: 1px 5px;
    color: var(--gold-soft);
  }
  pre {
    background: var(--ink-3);
    border: 1px solid var(--line);
    border-left: 3px solid var(--gold);
    border-radius: 8px;
    padding: 10px 12px;
    overflow: hidden;
    break-inside: avoid;
  }
  pre code { background: none; border: none; padding: 0; color: #cfc8bc; font-size: 8.4pt; }

  blockquote {
    margin: 12px 0;
    padding: 10px 14px;
    border-left: 3px solid var(--gold);
    background: rgba(200, 149, 43, 0.07);
    color: var(--bone-dim);
    font-style: italic;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 9.2pt;
    break-inside: avoid;
  }
  thead th {
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 7.6pt;
    color: var(--gold);
    border-bottom: 1px solid rgba(200, 149, 43, 0.5);
    padding: 7px 8px;
    font-weight: 600;
  }
  tbody td {
    border-bottom: 1px solid var(--line);
    padding: 7px 8px;
    color: #ddd6ca;
    vertical-align: top;
  }
  tbody tr:nth-child(even) td { background: rgba(255, 255, 255, 0.022); }

  hr { border: none; border-top: 1px solid var(--line); margin: 18px 0; }

  .quebra { break-before: page; }
  .destaque {
    background: linear-gradient(90deg, rgba(200, 149, 43, 0.16), rgba(200, 149, 43, 0.02));
    border-left: 3px solid var(--gold);
    padding: 9px 12px;
    margin: 12px 0;
    break-inside: avoid;
  }
`;

function htmlDoDocumento(md: string, titulo: string, subtitulo: string, selo: string) {
  // o primeiro H1 do .md e o titulo do documento (ja aparece na capa)
  const semTitulo = md.replace(/^#\s+.*\n+/, "");
  const corpo = marked.parse(semTitulo, { async: false }) as string;

  // destaca blocos que comecam com ">" (citacao/resumo) e listas de "Importante"
  const comDestaques = corpo.replace(
    /<p>\s*(<strong>)?(Importante|Atenção|ATENÇÃO|Importante:)/g,
    '<p class="destaque">$1$2',
  );

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>${CSS}</style>
</head>
<body>
  <div class="folha">
    <header class="capa">
      <span class="selo">${selo}</span>
      <h1 class="titulo">${titulo}</h1>
      <p class="subtitulo">${subtitulo}</p>
      <div class="rodape-capa">
        <span>Duh Corte Barbearia — Vila Nova, Jaraguá do Sul/SC</span>
        <span>duhcutebarbearia.com.br</span>
      </div>
    </header>
    ${comDestaques}
  </div>
</body>
</html>`;
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: BRAVE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 } });

for (const doc of DOCUMENTOS) {
  const md = await readFile(path.join(OUT, doc.md), "utf8");
  const html = htmlDoDocumento(md, doc.titulo, doc.subtitulo, doc.selo);

  const htmlPath = path.join(OUT, `.tmp-${doc.md.replace(/\.md$/, "")}.html`);
  await writeFile(htmlPath, html, "utf8");

  const page = await ctx.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // fontes

  const pdfPath = path.join(OUT, doc.md.replace(/\.md$/, ".pdf"));
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "14mm", left: "15mm", right: "15mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:7pt;color:#8a8377;font-family:Inter,sans-serif;width:100%;padding:0 16mm;letter-spacing:.18em;text-transform:uppercase;">Duh Corte Barbearia</div>`,
    footerTemplate: `<div style="font-size:7pt;color:#8a8377;font-family:Inter,sans-serif;width:100%;padding:0 16mm;display:flex;justify-content:space-between;"><span>${doc.selo}</span><span class="pageNumber"></span></div>`,
  });

  await page.close();
  console.log(`[pdf] ${path.basename(pdfPath)}`);
}

await browser.close();
console.log("PDFs gerados em entregaveis/");
