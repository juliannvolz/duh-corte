/**
 * Smoke test da producao — sem browser, so fetch. Roda em segundos e e a
 * porta de entrada de qualquer deploy: rotas publicas 200, sem pagina de
 * erro renderizada, e a API de slots viva.
 *
 *   node scripts/fumaca.mjs              # contra https://duh-corte.vercel.app
 *   FUMACA_BASE=http://localhost:3000 node scripts/fumaca.mjs
 *
 * Sai com codigo 0 so se TUDO passar. Queda de agente? Use qa-producao.mjs.
 */
const BASE = (process.env.FUMACA_BASE ?? "https://duh-corte.vercel.app").replace(/\/+$/, "");

const rotas = [
  "/",
  "/servicos",
  "/planos",
  "/agendar",
  "/local",
  "/privacidade",
  "/entrar",
  "/minha-conta",
  "/admin",
];

const ERRO_PAGINA = /application error|internal server error|__NEXT_ERROR/i;

async function fetchComTimeout(path, init) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), 30_000);
  try {
    return await fetch(`${BASE}${path}`, { ...init, signal: controle.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

const falhas = [];
const ok = [];

function registrar(nome, ok_nome, detalhe = "") {
  if (ok_nome) ok.push(nome);
  else falhas.push(`${nome} — ${detalhe}`);
  console.log(`${ok_nome ? "PASS" : "FAIL"}  ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

console.log(`\nSmoke: ${BASE}\n`);

for (const rota of rotas) {
  try {
    const res = await fetchComTimeout(rota);
    const corpo = await res.text();
    let detalhe = "";
    if (res.status !== 200) detalhe = `HTTP ${res.status}`;
    else if (ERRO_PAGINA.test(corpo)) detalhe = "pagina de erro no HTML";
    else if (!corpo.trim()) detalhe = "resposta vazia";
    registrar(rota, detalhe === "", detalhe);
  } catch (e) {
    registrar(rota, false, e instanceof Error ? e.message.slice(0, 120) : String(e));
  }
}

// a agenda tem de estar viva: API aceita o servico de teste e devolve grade
// (+12h garante uma data futura em qualquer fuso de servidor)
const data = new Date(Date.now() + 12 * 3600 * 1000).toISOString().slice(0, 10);

try {
  const res = await fetchComTimeout(`/api/slots?service=corte-degrade&date=${data}`);
  const corpo = await res.json().catch(() => null);
  const formatado = Array.isArray(corpo) ? JSON.stringify(corpo) : JSON.stringify(corpo ?? "");
  const detalhe =
    res.status !== 200
      ? `HTTP ${res.status}`
      : !corpo
        ? "corpo invalido"
        : "";
  registrar(`/api/slots (${data})`, detalhe === "", detalhe);
} catch (e) {
  registrar(`/api/slots (${data})`, false, e instanceof Error ? e.message.slice(0, 120) : String(e));
}

console.log(
  `\n${ok.length} PASS / ${falhas.length} FAIL` +
    (falhas.length ? `\n\nFalhas:\n${falhas.map((f) => `- ${f}`).join("\n")}\n` : ""),
);

process.exit(falhas.length ? 1 : 0);
