/**
 * Varre o codigo-fonte (ts/tsx) procurando palavras pt-BR com acento
 * faltando. Nao mexer em identificadores/imports/urls: so strings e JSX.
 *   node scripts/audit-accents.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..", "src");

// palavra acentuada -> versao sem acento
const PARES = [
  ["agendamento", "agendamento"],
  ["agência", "agencia"],
  ["além", "alem"],
  ["ano", "ano"],
  ["antes", "antes"],
  ["aqui", "aqui"],
  ["às", "as"],
  ["até", "ate"],
  ["cadeira", "cadeira"],
  ["cartão", "cartao"],
  ["código", "codigo"],
  ["confirmação", "confirmacao"],
  ["cópia", "copia"],
  ["corrente", "corrente"],
  ["crédito", "credito"],
  ["débito", "debito"],
  ["degradê", "degrade"],
  ["duração", "duracao"],
  ["é", "e"],
  ["está", "esta"],
  ["às", "as"],
  ["família", "familia"],
  ["finalização", "finalizacao"],
  ["fiz", "fiz"],
  ["hidratação", "hidratacao"],
  ["horário", "horario"],
  ["já", "ja"],
  ["linha", "linha"],
  ["localização", "localizacao"],
  ["manutenção", "manutencao"],
  ["mês", "mes"],
  ["nível", "nivel"],
  ["não", "nao"],
  ["nós", "nos"],
  ["opção", "opcao"],
  ["página", "pagina"],
  ["padrão", "padrao"],
  ["pagamento", "pagamento"],
  ["preço", "preco"],
  ["preços", "precos"],
  ["privacidade", "privacidade"],
  ["sábado", "sabado"],
  ["segunda", "segunda"],
  ["sempre", "sempre"],
  ["será", "sera"],
  ["serviço", "servico"],
  ["serviços", "servicos"],
  ["sim", "sim"],
  ["só", "so"],
  ["sobrenome", "sobrenome"],
  ["também", "tambem"],
  ["tempo", "tempo"],
  ["você", "voce"],
  ["vocês", "voces"],
  ["aplicação", "aplicacao"],
  ["início", "inicio"],
  ["número", "numero"],
  ["mínima", "minima"],
  ["máxima", "maxima"],
  ["público", "publico"],
  ["rápida", "rapida"],
  ["vaga", "vaga"],
  ["vale", "vale"],
  ["série", "serie"],
  ["atenção", "atencao"],
  ["cabeça", "cabeça"],
  ["corta", "corta"],
  ["diagnóstico", "diagnostico"],
  ["produção", "producao"],
  ["referência", "referencia"],
  ["agência", "agencia"],
  ["música", "musica"],
  ["número", "numero"],
  ["estética", "estetica"],
  ["calendário", "calendario"],
  ["privacidade", "privacidade"],
  ["utilização", "utilizacao"],
  ["informação", "informacao"],
  ["exclusão", "exclusao"],
  ["português", "portugues"],
  ["política", "politica"],
  ["legais", "legais"],
  ["análise", "analise"],
  ["dados", "dados"],
  ["títulos", "titulos"],
  ["sólidos", "solidos"],
];

// contexto: ignoramos identificadores
const IGNORAR_CONTEXTOS = [
  /https?:\/\//,
  /import\s/,
  /from\s+["']/,
  /className=/,
  /^[A-Za-z_$][\w$]*\s*[=:]/,
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) yield p;
  }
}

const achados = new Map();
for await (const file of walk(RAIZ)) {
  const src = await readFile(file, "utf8");
  const linhas = src.split("\n");
  linhas.forEach((linha, i) => {
    // ignora linhas de import e URLs
    if (/^\s*import\b/.test(linha) || /https?:\/\//.test(linha)) return;
    // so considera trecho de texto visivel: entre aspas ou entre > <
    const trechos = [...linha.matchAll(/"([^"]{4,})"|'([^']{4,})'|`([^`]{4,})`|>([^<]{3,})</g)];
    for (const t of trechos) {
      const texto = t[1] ?? t[2] ?? t[3] ?? t[4] ?? "";
      for (const [comAcento, semAcento] of PARES) {
        if (semAcento === comAcento) continue;
        const re = new RegExp(`(?<![\\p{L}])${semAcento}(?![\\p{L}])`, "iu");
        if (re.test(texto)) {
          const chave = `${file}:${i + 1}`;
          if (!achados.has(chave)) {
            achados.set(chave, { file, linha: i + 1, texto: linha.trim().slice(0, 140), comAcento, semAcento });
          }
        }
      }
    }
  });
}

if (achados.size === 0) {
  console.log("OK: nenhum termo sem acento.");
} else {
  for (const a of achados.values()) {
    console.log(`${a.file}:${a.linha}  "${a.semAcento}" -> "${a.comAcento}"`);
    console.log(`    ${a.texto}`);
  }
  console.log(`\n${achados.size} linha(s) para revisar.`);
}
