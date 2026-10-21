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

const vars = lerEnv(".env.vercel.local");
const db = vars.DATABASE_URL ?? vars.POSTGRES_URL ?? vars.POSTGRES_PRISMA_URL;
if (!db) {
  console.error("DATABASE_URL nao encontrado em .env.vercel.local");
  process.exit(1);
}

console.log("usando host:", new URL(db).host);

const env = { ...process.env, DATABASE_URL: db };

execFileSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "scripts/prepare-db.mts", "postgres"],
  { env, encoding: "utf8", stdio: "inherit" },
);

execFileSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "db", "push"],
  { env, encoding: "utf8", stdio: "inherit" },
);

// 3) seed — o .env local aponta para o SQLite, entao ele fica de fora na hora
const envLocal = ".env";
const backup = ".env.bkp-producao";
let moveu = false;
try {
  if (fs.existsSync(envLocal)) {
    fs.renameSync(envLocal, backup);
    moveu = true;
  }
  execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], {
    env,
    encoding: "utf8",
    stdio: "inherit",
  });
} finally {
  if (moveu && fs.existsSync(backup)) fs.renameSync(backup, envLocal);
}

console.log("banco de producao pronto");
