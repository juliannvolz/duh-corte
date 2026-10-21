/**
 * Programa de fidelidade — lado do servidor (pontos, recompensas, indicacao).
 * As regras puras estao em `src/lib/loyalty.ts`.
 */
import { prisma } from "@/lib/db";
import {
  LOYALTY,
  makeReferralCode,
  progressToNextTier,
  tiersUnlocked,
} from "@/lib/loyalty";

/** Garante que o cliente tenha um codigo de indicacao estavel. */
export async function ensureReferralCode(customer: { id: string; phone: string }) {
  const atual = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: { referralCode: true, phone: true },
  });
  if (atual?.referralCode) return atual.referralCode;

  const codigo = makeReferralCode(customer.phone);
  try {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { referralCode: codigo },
    });
  } catch {
    // corrida: outro processo ja gravou o codigo
    const outro = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: { referralCode: true },
    });
    return outro?.referralCode ?? codigo;
  }
  return codigo;
}

/**
 * Credita pontos de um atendimento concluido e libera as recompensas
 * das faixas que o cliente passou. Idempotente: so credita uma vez por
 * atendimento (usa o extrato para saber se ja foi pago).
 */
export async function awardPointsForAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { customer: true, service: true },
  });
  if (!appointment) return { points: 0, rewards: 0 };

  const jaCreditado = await prisma.pointEntry.findFirst({
    where: { appointmentId, reason: "atendimento" },
  });
  if (jaCreditado) return { points: 0, rewards: 0 };

  // assinante do Clube (VIP) ganha pontos em dobro
  const base = Math.floor(appointment.priceCents / 100) * LOYALTY.pointsPerReal;
  const pontos = appointment.planId ? base * 2 : base;

  await prisma.pointEntry.create({
    data: {
      customerId: appointment.customerId,
      delta: pontos,
      reason: "atendimento",
      appointmentId: appointment.id,
    },
  });

  const customer = await prisma.customer.update({
    where: { id: appointment.customerId },
    data: { points: { increment: pontos } },
    select: { points: true },
  });

  // recompensas: libera as faixas que ainda nao foram geradas
  let rewards = 0;
  const desbloqueadas = tiersUnlocked(customer.points);
  const existentes = await prisma.reward.findMany({
    where: { customerId: appointment.customerId },
    select: { label: true },
  });
  const rotulos = new Set(existentes.map((r) => r.label));

  for (const tier of desbloqueadas) {
    if (rotulos.has(tier.label)) continue;
    await prisma.reward.create({
      data: {
        customerId: appointment.customerId,
        label: tier.label,
        kind: tier.kind,
        valueCents: tier.valueCents,
        pointsCost: tier.points,
      },
    });
    rewards += 1;
  }

  // indicacao: bonus para quem indicou e para o indicado (1x, no 1o corte)
  const referral = await prisma.referral.findFirst({
    where: { refereeId: appointment.customerId, rewardedAt: null },
  });
  if (referral) {
    await prisma.pointEntry.create({
      data: {
        customerId: referral.referrerId,
        delta: referral.bonusPoints,
        reason: "indicacao",
        appointmentId: appointment.id,
      },
    });
    await prisma.pointEntry.create({
      data: {
        customerId: referral.refereeId,
        delta: referral.bonusPoints,
        reason: "indicacao",
        appointmentId: appointment.id,
      },
    });
    await prisma.customer.update({
      where: { id: referral.referrerId },
      data: { points: { increment: referral.bonusPoints } },
    });
    await prisma.customer.update({
      where: { id: referral.refereeId },
      data: { points: { increment: referral.bonusPoints } },
    });
    await prisma.referral.update({
      where: { id: referral.id },
      data: { rewardedAt: new Date() },
    });
  }

  return { points: pontos, rewards };
}

/** Resumo de fidelidade de um cliente. */
export async function getCustomerLoyalty(customerId: string) {  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, points: true, referralCode: true },
  });
  if (!customer) return null;

  const rewards = await prisma.reward.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  const entradas = await prisma.pointEntry.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    points: customer.points,
    referralCode: customer.referralCode,
    progress: progressToNextTier(customer.points),
    rewards,
    entries: entradas,
  };
}

/** Resumo de fidelidade pelo agendamento (atalho usado na API). */
export async function getLoyaltyByAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { customerId: true },
  });
  if (!appointment) return null;
  return getCustomerLoyalty(appointment.customerId);
}

/** Painel de fidelidade (resumo para o dono). */
export async function getLoyaltyOverview() {
  const [clientes, rewards, referrals, entries] = await Promise.all([
    prisma.customer.findMany({
      select: { id: true, name: true, phone: true, points: true, referralCode: true },
      orderBy: { points: "desc" },
      take: 8,
    }),
    prisma.reward.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { customer: { select: { name: true, phone: true } } },
    }),
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        referrer: { select: { name: true } },
        referee: { select: { name: true } },
      },
    }),
    prisma.pointEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const total = await prisma.customer.aggregate({ _sum: { points: true } });

  return {
    pontosEmCirculacao: total._sum.points ?? 0,
    clientes: clientes.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      points: c.points,
      referralCode: c.referralCode,
      proximo: progressToNextTier(c.points),
    })),
    rewards,
    referrals,
    entries,
  };
}
