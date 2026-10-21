import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";

const SENHA = process.env.NOVA_SENHA_ADMIN ?? "duh-corte-" + randomBytes(4).toString("hex");
const SEGREDO = randomBytes(24).toString("hex");
const PLACEHOLDER_DB =
  process.env.DATABASE_URL_VERCEL ??
  "postgresql://user:senha@host:5432/duh_corte?sslmode=require";

const env = { VERCEL_TELEMETRY_DISABLED: "1" };

function vercel(args: string[], input?: string) {
  return execFileSync(
    process.execPath,
    ["node_modules/vercel/dist/index.js", ...args],
    {
      env: { ...process.env, ...env },
      encoding: "utf8",
      input,
      stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    },
  );
}

const vars: Array<[string, string]> = [
  ["DATABASE_URL", PLACEHOLDER_DB],
  ["ADMIN_PASSWORD", SENHA],
  ["CALENDAR_TOKEN_SECRET", SEGREDO],
];

for (const [nome, valor] of vars) {
  try {
    vercel(["env", "add", nome, "production", "--force"], `${valor}\n`);
    console.log(`env ${nome} ok`);
  } catch (e) {
    const detalhe = e instanceof Error ? e.message : String(e);
    console.log(`env ${nome}: ${detalhe.slice(0, 300)}`);
  }
}

console.log("---");
console.log(`SENHA_ADMIN=${SENHA}`);
console.log(`CALENDAR_TOKEN_SECRET=${SEGREDO}`);
