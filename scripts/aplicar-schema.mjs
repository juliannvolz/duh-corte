import fs from "node:fs";
import { execFileSync } from "node:child_process";

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

const alvo = process.argv[2] === "producao" ? "producao" : "local";
const envBase = { ...process.env };

if (alvo === "producao") {
  const vars = lerEnv(".env.vercel.local");
  const db = vars.DATABASE_URL ?? vars.POSTGRES_URL ?? vars.POSTGRES_PRISMA_URL;
  if (!db) {
    console.error("DATABASE_URL nao encontrado em .env.vercel.local");
    process.exit(1);
  }
  envBase.DATABASE_URL = db;
}

const env = envBase;

// 1) schema: local usa sqlite, producao usa postgres
const usarPostgres = alvo === "producao";
execFileSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/prepare-db.mts", usarPostgres ? "postgres" : "sqlite"],
  { env, encoding: "utf8", stdio: "inherit" },
);

try {
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push"],
    { env, encoding: "utf8", stdio: "inherit" },
  );
  console.log(`schema aplicado (${alvo})`);
} finally {
  // devolve o schema local para sqlite
  execFileSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "scripts/prepare-db.mts", "sqlite"],
    { env, encoding: "utf8", stdio: "inherit" },
  );
}
