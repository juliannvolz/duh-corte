import { describe, expect, it } from "vitest";
import {
  currentTier,
  isValidReferralCode,
  makeReferralCode,
  nextTier,
  pointsForAmount,
  progressToNextTier,
  tiersUnlocked,
} from "@/lib/loyalty";

describe("pointsForAmount", () => {
  it("da 1 ponto por real", () => {
    expect(pointsForAmount(4500)).toBe(45);
    expect(pointsForAmount(8000)).toBe(80);
  });

  it("arredonda para baixo e ignora valores invalidos", () => {
    expect(pointsForAmount(4599)).toBe(45);
    expect(pointsForAmount(0)).toBe(0);
    expect(pointsForAmount(-100)).toBe(0);
  });
});

describe("faixas", () => {
  it("acha a proxima recompensa e a atual", () => {
    expect(nextTier(0)?.id).toBe("bronze");
    expect(currentTier(0)).toBeNull();
    expect(currentTier(120)?.id).toBe("prata");
    expect(nextTier(120)?.id).toBe("ouro");
  });

  it("nao tem proxima faixa quando o cliente esta no topo", () => {
    expect(nextTier(9999)).toBeNull();
  });

  it("calcula o quanto falta", () => {
    const p = progressToNextTier(80);
    expect(p.tier?.id).toBe("prata");
    expect(p.faltamPontos).toBe(20);
    expect(p.progresso).toBeGreaterThan(0);
    expect(p.progresso).toBeLessThan(1);
  });

  it("lista as faixas desbloqueadas", () => {
    expect(tiersUnlocked(50).map((t) => t.id)).toEqual(["bronze"]);
    expect(tiersUnlocked(220).map((t) => t.id)).toEqual(["bronze", "prata", "ouro"]);
  });
});

describe("codigo de indicacao", () => {
  it("gera codigo estavel e valido", () => {
    const a = makeReferralCode("47999995555");
    const b = makeReferralCode("47999995555");
    expect(a).toBe(b);
    expect(a).toMatch(/^DUC-[23456789A-HJ-NP-Z]{4}$/);
    expect(isValidReferralCode(a)).toBe(true);
  });

  it("gera codigos diferentes para telefones diferentes", () => {
    expect(makeReferralCode("47999995555")).not.toBe(makeReferralCode("47999996666"));
  });

  it("rejeita codigo invalido", () => {
    expect(isValidReferralCode("DUC-0000")).toBe(false);
    expect(isValidReferralCode("abc")).toBe(false);
    expect(isValidReferralCode(null)).toBe(false);
  });
});
