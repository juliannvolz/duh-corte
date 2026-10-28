/**
 * Replica as variaveis de producao da Vercel para os outros ambientes
 * (preview e development), usando os valores de .env.vercel.local.
 *
 *   npx tsx scripts/vercel-env-replicar.ts preview development
 *   npx tsx scripts/vercel-env-replicar.ts preview           # so preview
 *
 * Hooks opcionais:
 *   SUBSTITUIR_DATABASE_URL=<nova-url>   grava so DATABASE_URL com esse valor
 *
 * Os bastidos ficam na Vercel: `vercel env ls` nunca expõe valores Secret,
 * e por isso a fonte da verdade aqui e o pull local de producao.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ambientes = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const novaUrl = process.env.SUBSTITUIR_DATABASE_URL;

if (ambientes.length === 0) {
  console.error("uso: npx tsx scripts/vercel-env-replicar.ts <ambiente> [outro-ambiente]");
  process.exit(1);
}

function lerEnv(arquivo: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    vars[k] = v;
  }
  return vars;
}

const local = lerEnv(".env.vercel.local");

// exatamente as variaveis/apps da Vercel (vercel env ls); nada de runtime/CI
const CHAVES = [
  "AUTH_URL",
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "ADMIN_PASSWORD",
  "ADMIN_EMAILS",
  "CALENDAR_TOKEN_SECRET",
  "CRON_SECRET",
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "NEON_AUTH_BASE_URL",
  "NEON_PROJECT_ID",
  "NEXT_PUBLIC_SITE_URL",
  "PGDATABASE",
  "PGHOST",
  "PGHOST_UNPOOLED",
  "PGPASSWORD",
  "PGUSER",
  "POSTGRES_DATABASE",
  "POSTGRES_HOST",
  "POSTGRES_PASSWORD",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NO_SSL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_USER",
  "VITE_NEON_AUTH_URL",
];

let falhas = 0;
for (const chave of CHAVES) {
  let valor: string;
  if (chave === "DATABASE_URL" && novaUrl) {
    console.log(`${chave}: valor fornecido via SUBSTITUIR_DATABASE_URL`);
    valor = novaUrl;
  } else if (!(chave in local)) {
    console.warn(`AVISO: ${chave} nao existe em .env.vercel.local — pulada`);
    continue;
  } else {
    valor = local[chave];
  }

  for (const ambiente of ambientes) {
    try {
      const out = execFileSync(
        process.execPath,
        [
          "node_modules/vercel/dist/index.js",
          "env",
          "add",
          chave,
          ambiente,
          // variaveis com prefixo VITE_ ficam publicas no bundle: exigem type explicito
          ...(chave.startsWith("VITE_") ? ["--type", "config"] : []),
          "--force",
        ],
        {
          env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
          encoding: "utf8",
          input: `${valor}\n`,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      console.log(`${chave} -> ${ambiente}`);
    } catch (e) {
      falhas++;
      const detalhe = e instanceof Error ? e.message : String(e);
      console.error(`ERRO: ${chave} -> ${ambiente}: ${detalhe.slice(0, 200)}`);
    }
  }
}

if (falhas > 0) {
  console.error(`\n${falhas} gravacao(oes) falharam.`);
  process.exit(1);
}
console.log("\nAmbientes atualizados.");
