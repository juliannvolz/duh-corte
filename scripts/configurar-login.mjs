/**
 * Aplica as credenciais do login social no ambiente da Vercel e publica.
 *
 *   node scripts/configurar-login.mjs --google ID:SECRET
 *   node scripts/configurar-login.mjs --facebook ID:SECRET
 *   node scripts/configurar-login.mjs --apple ID:SECRET
 *   node scripts/configurar-login.mjs --google ID:SECRET --facebook ID:SECRET
 *
 * Sem argumentos: mostra o estado atual e o que falta.
 */
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);

function vercelEnv(nome, valor) {
  execFileSync(
    process.execPath,
    ["node_modules/vercel/dist/index.js", "env", "add", nome, "production", "--force"],
    {
      env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
      encoding: "utf8",
      input: `${valor}\n`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  console.log(`env ${nome} ok`);
}

const pares = [];
for (const arg of args) {
  const [flag, valor] = arg.split("=");
  if (!flag || !valor || !valor.includes(":")) {
    console.error(`formato invalido: ${arg} (use --google=ID:SECRET)`);
    process.exit(1);
  }
  const provedor = flag.replace(/^--/, "");
  const [id, secret] = valor.split(":");
  pares.push([provedor, id, secret]);
}

if (pares.length === 0) {
  console.log("uso: node scripts/configurar-login.mjs --google=ID:SECRET [--facebook=...] [--apple=...]");
  console.log("sem argumentos, nada foi alterado.");
  process.exit(0);
}

for (const [provedor, id, secret] of pares) {
  const nome = provedor.toUpperCase();
  vercelEnv(`AUTH_${nome}_ID`, id);
  vercelEnv(`AUTH_${nome}_SECRET`, secret);
}

console.log("\npublicando com o login habilitado...");
execFileSync(
  process.execPath,
  ["node_modules/vercel/dist/index.js", "deploy", "--prod", "--yes"],
  { env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" }, encoding: "utf8", stdio: "inherit" },
);
console.log("pronto. teste em https://duh-corte.vercel.app/entrar");
