import fs from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Limpa os dados de teste do banco de PRODUCAO (Neon) e do local.
 *   node scripts/limpar-producao.mjs
 */

function lerEnv(arquivo) {
  const vars = {};
  if (!fs.existsSync(arquivo)) return vars;
  for (const line of fs.readFileSync(arquivo, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    vars[k] = v;
  }
  return vars;
}

const vars = lerEnv(".env.vercel.local");
const db = vars.DATABASE_URL ?? vars.POSTGRES_URL;
if (!db) {
  console.error("DATABASE_URL nao encontrado em .env.vercel.local");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: db };
const backup = ".env.bkp-limpeza";
let moveu = false;
try {
  if (fs.existsSync(".env")) {
    fs.renameSync(".env", backup);
    moveu = true;
  }
  // o cliente Prisma precisa estar no modo postgres
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/prepare-db.mts", "postgres"],
    { env, encoding: "utf8", stdio: "inherit" },
  );
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "generate"], {
    env,
    encoding: "utf8",
    stdio: "inherit",
  });
  execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/limpar-teste.mts"], {
    env,
    encoding: "utf8",
    stdio: "inherit",
  });
} finally {
  if (moveu && fs.existsSync(backup)) fs.renameSync(backup, ".env");
  // devolve o schema local para sqlite
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/prepare-db.mts", "sqlite"],
    { env, encoding: "utf8", stdio: "inherit" },
  );
}
