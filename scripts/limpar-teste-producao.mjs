/**
 * Limpeza de dados de teste em PRODUCAO.
 *
 * Sem argumentos: apenas lista os agendamentos (dry-run).
 * Com `--confirmar`: apaga o agendamento do id informado em `--id` e, se o
 * cliente ficar sem nenhum outro agendamento e sem historico de fidelidade,
 * apaga o cliente tambem.
 *
 *   node scripts/limpar-teste-producao.mjs
 *   node scripts/limpar-teste-producao.mjs --id cmxxxx --confirmar
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
const id = args[args.indexOf("--id") + 1];
const confirmar = args.includes("--confirmar") && Boolean(id);

const prisma = new PrismaClient();

try {
  const ags = await prisma.appointment.findMany({
    include: { customer: true, service: true },
    orderBy: { startsAt: "asc" },
  });

  console.log(`agendamentos em producao: ${ags.length}`);
  for (const a of ags) {
    console.log(
      ` - ${a.id} | ${a.startsAt.toISOString()} | ${a.status} | ${a.customer.name} | ${a.customer.phone} | ${a.service.name}`,
    );
  }

  if (!confirmar) {
    console.log("\n(dry-run) nada apagado. Use --id <id> --confirmar para apagar.");
    process.exit(0);
  }

  const alvo = ags.find((a) => a.id === id);
  if (!alvo) {
    console.error(`agendamento ${id} nao encontrado`);
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.feedback.deleteMany({ where: { appointmentId: id } });
    await tx.pointEntry.deleteMany({ where: { appointmentId: id } });
    await tx.appointment.delete({ where: { id } });

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

  console.log(`agendamento ${id} apagado.`);
} finally {
  await prisma.$disconnect();
}
