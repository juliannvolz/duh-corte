/**
 * Backup logico do banco de producao (Neon) antes de aplicar schema.
 *
 * Dump JSON das tabelas que guardam dados do negocio. Nao substitui o backup
 * gerenciado do Neon — e uma rede de seguranca local, legivel e versionavel.
 *
 *   node scripts/backup-neon.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

function lerEnv(arquivo) {
  if (!fs.existsSync(arquivo)) return {};
  const vars = {};
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

const env = lerEnv(".env.vercel.local");
const url = env.DATABASE_URL ?? env.POSTGRES_URL ?? env.POSTGRES_PRISMA_URL;
if (!url) {
  console.error("DATABASE_URL nao encontrado em .env.vercel.local");
  process.exit(1);
}

process.env.DATABASE_URL = url;
const prisma = new PrismaClient();

const tabelas = [
  "customer",
  "service",
  "professional",
  "appointment",
  "timeOff",
  "testimonial",
  "plan",
  "pointEntry",
  "reward",
  "referral",
  "pendingItem",
];

const dump = { geradoEm: new Date().toISOString(), origem: "producao", tabelas: {} };

// Customer ganhou googleId no schema novo; producao ainda nao tem a coluna.
// O backup le explicitamente os campos que existem hoje.
const selects = {
  customer: {
    id: true,
    name: true,
    phone: true,
    email: true,
    points: true,
    referralCode: true,
    createdAt: true,
    updatedAt: true,
  },
};

try {
  for (const t of tabelas) {
    try {
      dump.tabelas[t] = selects[t]
        ? await prisma[t].findMany({ select: selects[t] })
        : await prisma[t].findMany();
    } catch (erro) {
      // tabela que ainda nao existe no banco (ex.: Feedback antes do push)
      dump.tabelas[t] = { erro: String(erro).split("\n").slice(0, 3).join(" | ") };
      console.error(`falha em ${t}:`, String(erro).split("\n").slice(0, 3).join(" | "));
    }
  }
} finally {
  await prisma.$disconnect();
}

fs.mkdirSync("backups", { recursive: true });
const arquivo = path.join("backups", `neon-${dump.geradoEm.replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(arquivo, JSON.stringify(dump, null, 2), "utf8");

const resumo = Object.entries(dump.tabelas)
  .map(([t, v]) => `${t}=${Array.isArray(v) ? v.length : "erro"}`)
  .join(" ");
console.log(`backup salvo em ${arquivo}`);
console.log(resumo);
