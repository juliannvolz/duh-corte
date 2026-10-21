import { execFileSync } from "node:child_process";

const valor = process.argv[2];
const nome = process.argv[3] ?? "NEXT_PUBLIC_SITE_URL";

if (!valor) {
  console.error("uso: node scripts/vercel-env.mts <valor> [nome-da-variavel]");
  process.exit(1);
}

try {
  const out = execFileSync(
    process.execPath,
    ["node_modules/vercel/dist/index.js", "env", "add", nome, "production", "--force"],
    {
      env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" },
      encoding: "utf8",
      input: `${valor}\n`,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  console.log(out.trim().split("\n").slice(-2).join("\n"));
} catch (e) {
  const detalhe = e instanceof Error ? e.message : String(e);
  console.error(detalhe.slice(0, 400));
  process.exit(1);
}
