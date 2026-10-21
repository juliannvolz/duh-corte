/**
 * Alterna o schema do Prisma entre SQLite (local) e Postgres (Vercel).
 *
 * O provider do datasource nao pode vir de variavel de ambiente, entao
 * mantemos o schema.prisma e trocamos o provider conforme o alvo. As duas
 * versoes sao SEMPRE derivadas do arquivo atual (nada de snapshot antigo).
 *
 *   npx tsx scripts/prepare-db.mts postgres
 *   npx tsx scripts/prepare-db.mts sqlite
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA = path.join(ROOT, "prisma", "schema.prisma");
const POSTGRES = path.join(ROOT, "prisma", "schema.postgres.prisma");
const SQLITE = path.join(ROOT, "prisma", "schema.sqlite.prisma");

const alvo = process.argv[2] === "postgres" ? "postgres" : "sqlite";
const atual = await readFile(SCHEMA, "utf8");

// limpa as marcacoes de provider antes de trocar
const limpo = atual.replace(/provider\s*=\s*"(sqlite|postgresql)"/g, 'provider = "__PROVIDER__"');

if (alvo === "postgres") {
  const postgres = limpo.replace(/__PROVIDER__/g, "postgresql");
  await writeFile(POSTGRES, postgres, "utf8");
  await writeFile(SCHEMA, postgres, "utf8");
  console.log("schema.prisma -> postgres (schema.postgres.prisma atualizado)");
} else {
  const sqlite = limpo.replace(/__PROVIDER__/g, "sqlite");
  await writeFile(SQLITE, sqlite, "utf8");
  await writeFile(SCHEMA, sqlite, "utf8");
  console.log("schema.prisma -> sqlite (schema.sqlite.prisma atualizado)");
}
