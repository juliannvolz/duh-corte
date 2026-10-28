/**
 * Dropa o schema `public` do banco compartilhado legado (neon-aqua-bell),
 * depois do duh-corte migrar para o projeto proprio. O `crm` (CRM-DOC2B)
 * e o `neon_auth` NAO sao tocados.
 *
 *   node scripts/dropar-publico-legado.mjs --apagar     # derruba de verdade
 *   node scripts/dropar-publico-legado.mjs              # so simula
 *
 * Travas: (1) URL precisa ser a do banco legado (ep-aged-cherry); (2) o
 * public precisa ter exatamente as 21 tabelas do duh-corte; (3) exige --apagar.
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const LEGADO = "ep-aged-cherry";
const TABELAS_DUH = 21;

const url =
  process.env.DATABASE_URL_ORIGEM ??
  (fs.existsSync(".env.vercel-db-url.txt")
    ? fs.readFileSync(".env.vercel-db-url.txt", "utf8").trim()
    : undefined);
if (!url) {
  console.error("sem URL do banco legado");
  process.exit(1);
}
if (!url.includes(LEGADO)) {
  console.error(`ABORTADO: a URL nao e o banco legado (${LEGADO})`);
  process.exit(1);
}

const deBoa = process.argv.includes("--apagar");
const db = new PrismaClient({ datasources: { db: { url } } });

const contagem = async () =>
  db.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );

const antes = await contagem();
if (antes[0].n !== TABELAS_DUH) {
  console.error(
    `ABORTADO: public tem ${antes[0].n} tabela(s), esperado ${TABELAS_DUH}. O banco mudou? Confira antes.`,
  );
  process.exit(1);
}

if (!deBoa) {
  console.log(`SIMULACAO: droparia "public" CASCADE (${antes[0].n} tabelas). Rode com --apagar.`);
} else {
  await db.$executeRawUnsafe(`DROP SCHEMA "public" CASCADE;`);
  console.log("DROP SCHEMA public CASCADE executado.");
}

const schemas = await db.$queryRawUnsafe(
  `SELECT schema_name FROM information_schema.schemata
   WHERE schema_name NOT IN ('pg_catalog','information_schema') ORDER BY 1`,
);
console.log("schemas restantes:", schemas.map((s) => s.schema_name).join(", "));
const crm = await db.$queryRawUnsafe(
  `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'crm'`,
);
const auth = await db.$queryRawUnsafe(
  `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'neon_auth'`,
);
console.log(`crm: ${crm[0].n} tabela(s) | neon_auth: ${auth[0].n} tabela(s)`);
await db.$disconnect();
