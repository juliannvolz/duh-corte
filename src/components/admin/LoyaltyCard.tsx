"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Sparkles, Users } from "lucide-react";
import { formatBRL } from "@/lib/site";

type Tier = { id: string; points: number; kind: string; valueCents: number; label: string };

type Overview = {
  pontosEmCirculacao: number;
  clientes: Array<{
    id: string;
    name: string;
    phone: string;
    points: number;
    referralCode: string | null;
    proximo: { tier: Tier | null; faltamPontos: number };
  }>;
  rewards: Array<{
    id: string;
    label: string;
    kind: string;
    valueCents: number;
    status: string;
    createdAt: string;
    customer: { name: string; phone: string };
  }>;
  referrals: Array<{
    id: string;
    bonusPoints: number;
    rewardedAt: string | null;
    referrer: { name: string };
    referee: { name: string };
  }>;
};

/**
 * Card do programa de fidelidade no painel do dono:
 * pontos em circulacao, recompensas liberadas, quem esta acumulando
 * e as indicacoes recebidas.
 */
export function LoyaltyCard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/loyalty", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar");
      setData((await res.json()) as Overview);
    } catch {
      setError("Não foi possível carregar a fidelidade agora.");
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(id);
  }, [load]);

  async function toggleReward(id: string, action: "use" | "restore") {
    await fetch("/api/admin/loyalty", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    void load();
  }

  return (
    <div className="rounded-3xl border border-line bg-ink-2/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold">
            <Sparkles className="size-4" /> Fidelidade
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-bone-dim">
            1 ponto por real gasto. O cliente recebe 50 pontos (R$ 10), 100 (R$ 25), 200 (corte
            grátis) e 500 (2 cortes grátis). Indicação vale 30 pontos para quem indica e para o
            indicado.
          </p>
        </div>
        {data ? (
          <div className="text-right">
            <p className="display text-2xl text-gold">{data.pontosEmCirculacao}</p>
            <p className="text-[0.6rem] uppercase tracking-[0.16em] text-bone-dim/70">
              pontos em circulação
            </p>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {data ? (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-bone-dim/70">Recompensas liberadas</p>
            {data.rewards.length === 0 ? (
              <p className="mt-2 text-sm text-bone-dim">Nenhuma recompensa liberada ainda.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.rewards.map((reward) => (
                  <li
                    key={reward.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-bone">
                      <Gift className="size-3.5 text-gold" />
                      {reward.customer.name} — {reward.label}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void toggleReward(reward.id, reward.status === "used" ? "restore" : "use")
                      }
                      className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
                        reward.status === "used"
                          ? "border-line text-bone-dim/60"
                          : "border-emerald-400/50 text-emerald-300"
                      }`}
                    >
                      {reward.status === "used" ? "usada" : "marcar como usada"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-bone-dim/70">
              Clientes com mais pontos
            </p>
            <ul className="mt-3 space-y-2">
              {data.clientes.slice(0, 5).map((cliente) => (
                <li
                  key={cliente.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2 text-sm"
                >
                  <span className="text-bone">
                    {cliente.name}
                    {cliente.referralCode ? (
                      <span className="ml-2 text-xs text-bone-dim/70">{cliente.referralCode}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-gold">
                    {cliente.points} pts
                    {cliente.proximo.tier
                      ? ` · faltam ${cliente.proximo.faltamPontos}`
                      : " · topo"}
                  </span>
                </li>
              ))}
              {data.clientes.length === 0 ? (
                <li className="text-sm text-bone-dim">Ainda sem clientes no programa.</li>
              ) : null}
            </ul>
          </div>

          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-bone-dim/70">
              <Users className="size-3.5" /> Indicações
            </p>
            {data.referrals.length === 0 ? (
              <p className="mt-2 text-sm text-bone-dim">Nenhuma indicação registrada.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.referrals.map((referral) => (
                  <li key={referral.id} className="border-b border-line pb-2 text-sm text-bone-dim">
                    {referral.referrer.name} indicou {referral.referee.name}
                    {referral.rewardedAt ? " · bônus creditado" : " · aguardando o 1º corte"}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data.rewards.length > 0 ? (
            <p className="text-xs leading-relaxed text-bone-dim/70">
              Ao marcar como usada, o desconto ({formatBRL(data.rewards[0].valueCents)} no primeiro
              da lista) já deve ter sido aplicado no balcão.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-dim">Carregando fidelidade...</p>
      )}
    </div>
  );
}
