/**
 * Testa o canal de notificação por e-mail sem precisar reservar nada.
 *
 *   node scripts/testar-notificacao.mjs
 *
 * Lê RESEND_API_KEY / NOTIFY_EMAIL / NOTIFY_FROM do ambiente e, se não
 * encontrar, dos arquivos .env, .env.local e .env.vercel.local.
 */
import fs from "node:fs";

function lerEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return {};
  const vars = {};
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    if (i < 0) continue;
    const chave = linha.slice(0, i).trim();
    let valor = linha.slice(i + 1).trim();
    if (valor.startsWith('"') && valor.endsWith('"')) valor = valor.slice(1, -1);
    vars[chave] = valor;
  }
  return vars;
}

const arquivos = [".env", ".env.local", ".env.vercel.local"];
const doArquivo = Object.assign({}, ...arquivos.map(lerEnv));

function ler(chave) {
  return (process.env[chave] ?? doArquivo[chave] ?? "").trim();
}

const apiKey = ler("RESEND_API_KEY");
const destinatarios = ler("NOTIFY_EMAIL") || ler("ADMIN_EMAILS");
const remetente = ler("NOTIFY_FROM") || "Duh Corte <onboarding@resend.dev>";

if (!apiKey) {
  console.log("DESLIGADO: RESEND_API_KEY não configurada.");
  console.log("Nada a testar — as reservas continuam funcionando sem aviso.");
  console.log("Passo a passo: docs/NOTIFICACOES.md");
  process.exit(0);
}

const para = destinatarios
  .split(",")
  .map((e) => e.trim())
  .filter((e) => e.includes("@"));

if (para.length === 0) {
  console.error("Falta NOTIFY_EMAIL (para quem o aviso vai).");
  process.exit(1);
}

console.log(`enviando de: ${remetente}`);
console.log(`enviando para: ${para.join(", ")}`);

const resposta = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: remetente,
    to: para,
    subject: "Teste — aviso de reserva da Duh Corte",
    text: [
      "Se você recebeu este e-mail, o aviso automático de novas reservas está funcionando.",
      "",
      "A partir de agora, cada reserva feita pelo site chega aqui com nome, WhatsApp,",
      "serviço, profissional, horário e valor.",
      "",
      "— Duh Corte Barbearia",
    ].join("\n"),
  }),
});

const corpo = await resposta.text().catch(() => "");

if (!resposta.ok) {
  console.error(`FALHOU (HTTP ${resposta.status}): ${corpo.slice(0, 300)}`);
  console.error(
    resposta.status === 403
      ? "Dica: sem domínio verificado o Resend só entrega para o e-mail dono da conta."
      : "Confira a API key e o remetente.",
  );
  process.exit(1);
}

console.log("OK: e-mail aceito pelo Resend.");
console.log(corpo.slice(0, 200));
