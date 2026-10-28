/**
 * Cópia das 21 tabelas do banco compartilhado (schema public no
 * neon-aqua-bell) para o projeto Neon novo do Duh Corte.
 *
 *   node scripts/migrar-neon.mjs <postgres://...novo-projeto.../db?sslmode=require>
 *
 * Origem: .env.vercel.local DATABASE_URL? em DATABASE_URL_ORIGEM.
 *
 * Faz em prisma app API madeira (não SQL cru), então ids e tipos sobem
 * exatamente como estavam. Ajusta em ordem de pai→filho e compara contagens
 * no fim: só sai 0 se as contas bateram nas 21 tabelas.
 *
 * O schema do PRISMA precisa estar com provider postgresql e o client
 * gerado (`npm run db:postgres && npx prisma generate`) antes de rodar.
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

function lerEnv(arquivo) {
  const vars = {};
  if (!fs.existsSync(arquivo)) return vars;
  for (const line of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    vars[k] = v;
  }
  return vars;
}

const destino = process.argv[2] ?? process.env.DATABASE_URL_DESTINO;
const origem =
  process.env.DATABASE_URL_ORIGEM ??
  lerEnv(".env.vercel.local").DATABASE_URL ??
  process.env.DATABASE_URL;

if (!destino || !origem) {
  console.error(
    "uso: node scripts/migrar-neon.mjs <DATABASE_URL-destino>\n" +
      '       (origem: .env.vercel.local DATABASE_URL ou env DATABASE_URL_ORIGEM)',
  );
  process.exit(1);
}
if (destino.trim() === origem.trim()) {
  console.error("origem e destino sao o mesmo banco — abortando");
  process.exit(1);
}

// pai -> filho: cada modelo so entra depois de quem ele referencia
const ordem = [
  "businessSettings",
  "weekday",
  "serviceCategory",
  "service",
  "professional",
  "professionalHours",
  "professionalService",
  "plan",
  "galleryItem",
  "customer",
  "customerClaim",
  "pointEntry",
  "reward",
  "referral",
  "subscription",
  "payment",
  "appointment",
  "feedback",
  "timeOff",
  "testimonial",
  "pendingItem", // sem FK; vai por ultimo, nao apaga nada
];

const de = new PrismaClient({ datasources: { db: { url: origem } } });
const para = new PrismaClient({ datasources: { db: { url: destino } } });

const capturar = (erro, lado) => {
  console.error(`\n${lado}: ${erro.message?.slice(0, 300) ?? erro}`);
  process.exitCode = 1;
};

try {
  await de.$connect();
  await para.$connect();
} catch (erro) {
  capturar(erro, "conexão");
  process.exit(1);
}

try {
  // limpa o destino de tras pra frente (defensivo: destino deve estar vazio)
  console.log("\n== limpando destino ==");
  for (const tabela of [...ordem].reverse()) {
    const c = await para[tabela].deleteMany({});
    console.log(`  ${tabela}: ${c.count} removido(s)`);
  }
} catch (erro) {
  capturar(erro, "limpeza");
  await finalizar();
}

console.log("\n== copiando ==");
const contagens = {};
let divergencias = 0;

for (const tabela of ordem) {
  try {
    const linhas = await de[tabela].findMany();
    let inseridas = 0;
    for (let i = 0; i < linhas.length; i += 100) {
      const lote = linhas.slice(i, i + 100);
      const res = await para[tabela].createMany({ data: lote });
      inseridas += res.count;
    }
    contagens[tabela] = { origem: linhas.length, destino: inseridas };
    const marca = linhas.length === inseridas ? "ok" : "DIVERGE";
    if (linhas.length !== inseridas) divergencias++;
    console.log(`  ${tabela}: ${linhas.length} -> ${inseridas} ${marca}`);
  } catch (erro) {
    divergencias++;
    capturar(erro, `cópia de ${tabela}`);
  }
}

await finalizar();

if (divergencias === 0) {
  console.log("\nMIGRACAO CONCLUIDA: todas as 21 tabelas bateram.");
} else {
  console.error(`\n${divergencias} tabela(s) divergem — nada de ativar o banco novo.`);
}

async function finalizar() {
  await de.$disconnect().catch(() => {});
  await para.$disconnect().catch(() => {});
  if (divergencias > 0) process.exit(1);
}
