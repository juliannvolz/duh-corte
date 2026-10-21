/**
 * Programa de fidelidade "Duh Corte" — regras puras (sem banco, sem UI).
 *
 * Base de mercado (padrao de programs de fidelidade de barbearia/varejo):
 *  - 1 ponto por R$ 1 gasto em atendimento concluido;
 *  - recompensas por faixa de pontos (desconto em dinheiro ou corte gratis);
 *  - indicacao: quem indica e quem foi indicado ganham bonus no primeiro
 *    corte concluído do indicado.
 */

export const LOYALTY = {
  /** 1 ponto a cada 1 real. */
  pointsPerReal: 1,
  /** Bonus para quem indica e para o indicado. */
  referralBonusPoints: 30,
  /** Faixas liberadas por ordem de pontos. */
  tiers: [
    { id: "bronze", points: 50, kind: "desconto", valueCents: 1000, label: "R$ 10 de desconto" },
    { id: "prata", points: 100, kind: "desconto", valueCents: 2500, label: "R$ 25 de desconto" },
    { id: "ouro", points: 200, kind: "corte", valueCents: 5000, label: "1 corte grátis (até R$ 50)" },
    { id: "diamante", points: 500, kind: "corte", valueCents: 10000, label: "2 cortes grátis (até R$ 100)" },
  ],
} as const;

export type LoyaltyTier = (typeof LOYALTY.tiers)[number];

/** Pontos ganhos por um atendimento de `cents`. */
export function pointsForAmount(cents: number): number {
  if (cents <= 0) return 0;
  return Math.floor(cents / 100) * LOYALTY.pointsPerReal;
}

/** Faixa imediatamente alcancavel (a proxima recompensa). */
export function nextTier(points: number): LoyaltyTier | null {
  for (const tier of LOYALTY.tiers) {
    if (points < tier.points) return tier;
  }
  return null;
}

/** Ultima faixa conquistada. */
export function currentTier(points: number): LoyaltyTier | null {
  let atual: LoyaltyTier | null = null;
  for (const tier of LOYALTY.tiers) {
    if (points >= tier.points) atual = tier;
  }
  return atual;
}

/**
 * Quanto falta (em pontos) para a proxima recompensa e quanto falta em reais.
 */
export function progressToNextTier(points: number): {
  tier: LoyaltyTier | null;
  faltamPontos: number;
  faltamReais: number;
  progresso: number;
} {
  const tier = nextTier(points);
  if (!tier) {
    return { tier: null, faltamPontos: 0, faltamReais: 0, progresso: 1 };
  }
  const faltamPontos = Math.max(0, tier.points - points);
  const anterior = currentTier(points)?.points ?? 0;
  const faixa = Math.max(1, tier.points - anterior);
  return {
    tier,
    faltamPontos,
    faltamReais: faltamPontos,
    progresso: Math.min(1, Math.max(0, (points - anterior) / faixa)),
  };
}

/**
 * Quantas faixas de bonus o cliente desbloqueou com `points` pontos.
 * Usado para gerar as recompensas (Reward) assim que o saldo passa da faixa.
 */
export function tiersUnlocked(points: number): LoyaltyTier[] {
  return LOYALTY.tiers.filter((tier) => points >= tier.points);
}

/**
 * Codigo de indicacao do cliente: DUC-XXXX (curto, sem ambiguidade visual).
 * Deriva do id/telefone para ser estavel entre sessoes.
 */
export function makeReferralCode(seed: string): string {
  const base = seed.replace(/\D/g, "") || seed;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  let value = hash;
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length);
  }
  return `DUC-${code}`;
}

export function isValidReferralCode(code: string | null | undefined): boolean {
  return Boolean(code && /^DUC-[23456789A-HJ-NP-Z]{4}$/i.test(code.trim()));
}
