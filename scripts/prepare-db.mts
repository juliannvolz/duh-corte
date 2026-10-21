/**
 * Alterna o schema do Prisma entre SQLite (local) e Postgres (Vercel).
 *
 * O provider do datasource nao pode vir de variavel de ambiente, entao
 * mantemos dois arquivos e trocamos o schema.prisma antes do deploy.
 *
 *   npx tsx scripts/prepare-db.mts postgres
 *   npx tsx scripts/prepare-db.mts sqlite
 */
import { copyFile, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync as existe } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA = path.join(ROOT, "prisma", "schema.prisma");
const POSTGRES = path.join(ROOT, "prisma", "schema.postgres.prisma");
const SQLITE = path.join(ROOT, "prisma", "schema.sqlite.prisma");
const alvo = process.argv[2] === "postgres" ? "postgres" : "sqlite";

if (alvo === "postgres") {
  // garante que o schema.postgres existe a partir do atual
  const atual = await readFile(SCHEMA, "utf8");
  const postgres = atual.replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"',
  );
  await writeFile(POSTGRES, postgres, "utf8");
  await copyFile(POSTGRES, SCHEMA);
  console.log("schema.prisma -> postgres (prisma/schema.postgres.prisma atualizado)");
} else {
  if (!existe(SQLITE)) {
    // sem arquivo salvo, gera a partir do atual invertendo o provider
    try {
      const atual = await readFile(SCHEMA, "utf8");
      const sqlite = atual.replace(
        /provider\s*=\s*"postgresql"/,
        'provider = "sqlite"',
      );
      await writeFile(SQLITE, sqlite, "utf8");
    } catch {
      // sem schema.postgres salvo: nada a fazer
    }
  }
  try {
    await copyFile(SQLITE, SCHEMA);
    console.log("schema.prisma -> sqlite");
  } catch {
    console.log("schema.prisma ja esta em sqlite (nada a fazer)");
  }
}

await mkdir(path.join(ROOT, "prisma", "migrations"), { recursive: true });
