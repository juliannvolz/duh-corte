/**
 * Limpeza de dados de teste em PRODUCAO.
 *
 * Sem argumentos: apenas lista os agendamentos (dry-run).
 *
 *   node scripts/limpar-teste-producao.mjs
 *   node scripts/limpar-teste-producao.mjs --id cmxxxx --confirmar
 *   node scripts/limpar-teste-producao.mjs --teste --confirmar
 *
 * `--teste` apaga os agendamentos cujo nome do cliente casa com os nomes que os
 * scripts de QA usam ("Cliente QA", "Diagnostico ..."). O cliente tambem sai se
 * ficar sem nenhum outro agendamento e sem historico de fidelidade.
 */
import fs from "node:fs";
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
process.env.DATABASE_URL = env.DATABASE_URL ?? env.POSTGRES_URL ?? env.POSTGRES_PRISMA_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL ausente em .env.vercel.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const id = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
const porNome = args.includes("--teste");
const confirmar = args.includes("--confirmar") && (Boolean(id) || porNome);

/** nomes que os scripts de QA criam */
const NOME_DE_TESTE = /^(cliente qa|diagnostico)/i;

const prisma = new PrismaClient();

try {
  const ags = await prisma.appointment.findMany({
    include: { customer: true, service: true },
    orderBy: { startsAt: "asc" },
  });

  console.log(`agendamentos em producao: ${ags.length}`);
  for (const a of ags) {
    const alvo = porNome ? NOME_DE_TESTE.test(a.customer.name.trim()) : a.id === id;
    console.log(
      `${alvo ? "->" : "  "} ${a.id} | ${a.startsAt.toISOString()} | ${a.status} | ${a.customer.name} | ${a.customer.phone} | ${a.service.name}`,
    );
  }

  const alvos = porNome ? ags.filter((a) => NOME_DE_TESTE.test(a.customer.name.trim())) : ags.filter((a) => a.id === id);

  if (!confirmar) {
    console.log("\n(dry-run) nada apagado. Use --id <id> --confirmar ou --teste --confirmar.");
    process.exit(0);
  }

  if (alvos.length === 0) {
    console.log("nada para apagar.");
    process.exit(0);
  }

  for (const alvo of alvos) {
    await prisma.$transaction(async (tx) => {
      await tx.feedback.deleteMany({ where: { appointmentId: alvo.id } });
      await tx.pointEntry.deleteMany({ where: { appointmentId: alvo.id } });
      await tx.appointment.delete({ where: { id: alvo.id } });

      const restantes = await tx.appointment.count({ where: { customerId: alvo.customerId } });
      const pontos = await tx.pointEntry.count({ where: { customerId: alvo.customerId } });
      const recompensas = await tx.reward.count({ where: { customerId: alvo.customerId } });
      const indicacoes = await tx.referral.count({
        where: { OR: [{ referrerId: alvo.customerId }, { refereeId: alvo.customerId }] },
      });

      if (restantes === 0 && pontos === 0 && recompensas === 0 && indicacoes === 0) {
        await tx.customer.delete({ where: { id: alvo.customerId } }).catch(() => {});
        console.log(`cliente ${alvo.customer.name} (${alvo.customerId}) apagado: sem historico.`);
      } else {
        console.log(`cliente ${alvo.customer.name} mantido (tem historico).`);
      }
    });
    console.log(`agendamento ${alvo.id} apagado.`);
  }

  console.log(`\ntotal apagado: ${alvos.length}`);
} finally {
  await prisma.$disconnect();
}
