import { afterEach, describe, expect, it, vi } from "vitest";
import { limparLimites, limitar } from "@/lib/rate-limit";

afterEach(() => {
  limparLimites();
  vi.useRealTimers();
});

describe("limitar", () => {
  it("libera as primeiras tentativas e bloqueia depois do teto", () => {
    expect(limitar("a", 3, 60_000).ok).toBe(true);
    expect(limitar("a", 3, 60_000).ok).toBe(true);
    expect(limitar("a", 3, 60_000).ok).toBe(true);

    const bloqueado = limitar("a", 3, 60_000);
    expect(bloqueado.ok).toBe(false);
    expect(bloqueado.esperarMs).toBeGreaterThan(0);
  });

  it("cada chave tem o proprio balde", () => {
    expect(limitar("a", 1, 60_000).ok).toBe(true);
    expect(limitar("a", 1, 60_000).ok).toBe(false);
    expect(limitar("b", 1, 60_000).ok).toBe(true);
  });

  it("libera de novo depois da janela", () => {
    vi.useFakeTimers();
    expect(limitar("a", 1, 1_000).ok).toBe(true);
    expect(limitar("a", 1, 1_000).ok).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(limitar("a", 1, 1_000).ok).toBe(true);
  });

  it("conta as restantes", () => {
    expect(limitar("a", 2, 60_000).restantes).toBe(1);
    expect(limitar("a", 2, 60_000).restantes).toBe(0);
  });
});
