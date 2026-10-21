/**
 * Extrai o texto renderizado de todas as rotas publicas e procura palavras
 * pt-BR com acento faltando (lista de termos comuns do dominio).
 *   node scripts/audit-text.mjs
 */
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const ROUTES = [
  "/",
  "/servicos",
  "/planos",
  "/local",
  "/agendar",
  "/privacidade",
  "/admin",
];

const ESPERADOS = [
  "barbearia",
  "cadeira",
  "agendamento",
  "agendar",
  "horário",
  "horarios",
  "duração",
  "preço",
  "precos",
  "serviço",
  "servicos",
  "equipe",
  "avaliações",
  "sábado",
  "sabado",
  "sábado",
  "sexta",
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "local",
  "endereço",
  "telefone",
  "atendimento",
  "confirmação",
  "confirme",
  "cancelamento",
  "padrão",
  "estilo",
  "você",
  "não",
  "sim",
  "até",
  "já",
  "só",
  "mais",
  "também",
  "está",
  "estão",
  "tráfego",
  "página",
  "linha",
  "unidade",
  "história",
  "combina",
  "combinações",
  "sobrancelha",
  "degradê",
  "navalhado",
  "infantil",
  "finalização",
  "hidratação",
  "mensagem",
  "reserva",
  "reservas",
  "alterações",
  "otimização",
  "versão",
  "conexão",
  "opção",
  "exceção",
];

// palavras que aparecem sem acento de proposito (nomes proprios, termos)
const IGNORAR = new Set([
  "barbearia",
  "duhcorte",
  "jaragua",
  "cashbarber",
  "pix",
  "whatsapp",
  "instagram",
  "google",
  "maps",
  "degrade",
  "moica",
  "vila",
  "nova",
]);

const achados = [];
for (const rota of ROUTES) {
  const res = await fetch(`${BASE}${rota}`);
  const html = await res.text();
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ");
  const minusculas = texto.toLowerCase();
  for (const termo of ESPERADOS) {
    // sem acento no site mas com acento esperado
    const semAcento = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (semAcento === termo) continue;
    const re = new RegExp(`(?<![\\p{L}])${semAcento}(?![\\p{L}])`, "gu");
    for (const m of minusculas.matchAll(re)) {
      const idx = m.index ?? 0;
      const contexto = texto.slice(Math.max(0, idx - 45), idx + 55).trim();
      achados.push({ rota, termo, semAcento, contexto });
    }
  }
}

const unicos = new Map();
for (const a of achados) {
  const key = `${a.rota}|${a.semAcento}`;
  if (!unicos.has(key)) unicos.set(key, a);
}

if (unicos.size === 0) {
  console.log("OK: nenhum termo sem acento encontrado.");
} else {
  for (const a of unicos.values()) {
    console.log(`[${a.rota}] "${a.semAcento}" (esperado "${a.termo}") -> ...${a.contexto}...`);
  }
}
console.log(`\n${unicos.size} ocorrencia(s) para revisar.`);
