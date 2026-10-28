/**
 * Inspeciona os schemas do banco compartilhado (legado) antes do drop.
 *   node scripts/ver-schemas.mjs
 * A URL vem de DATABASE_URL_ORIGEM ou de .env.vercel-db-url.txt.
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const url =
  process.env.DATABASE_URL_ORIGEM ??
  (fs.existsSync(".env.vercel-db-url.txt")
    ? fs.readFileSync(".env.vercel-db-url.txt", "utf8").trim()
    : undefined);
if (!url) {
  console.error("sem URL do banco legado");
  process.exit(1);
}

const db = new PrismaClient({ datasources: { db: { url } } });
const schemas = await db.$queryRawUnsafe(
  `SELECT schema_name FROM information_schema.schemata
   WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY 1`,
);
console.log("schemas:", schemas.map((s) => s.schema_name).join(", "));

const tabelas = await db.$queryRawUnsafe(
  `SELECT table_schema, count(*)::int AS n FROM information_schema.tables
   WHERE table_type = 'BASE TABLE'
     AND table_schema NOT IN ('pg_catalog','information_schema')
   GROUP BY 1 ORDER BY 1`,
);
for (const t of tabelas) console.log(`  ${t.table_schema}: ${t.n} tabela(s)`);
await db.$disconnect();
