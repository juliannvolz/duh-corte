import { Gift, Sparkles, Users } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Particles } from "@/components/motion/ParticlesLazy";
import { LOYALTY } from "@/lib/loyalty";
import { formatBRL } from "@/lib/site";

/**
 * Programa de fidelidade — o cliente ve as faixas publicas no site e o
 * barbeiro controla os resgates no painel.
 */
export function Loyalty() {
  return (
    <Section id="fidelidade" tone="ink2" className="relative overflow-hidden py-24 md:py-32">
      <Particles density={0.00004} className="z-0 opacity-50" />

      <div className="shell relative">
        <SectionHeading
          eyebrow="Programa de fidelidade"
          title="Quanto mais você corta,"
          accent="mais você ganha."
          description="Cada real gasto vira ponto. Os pontos viram desconto, corte grátis e indicação — sem app para instalar, sem cartão, sem enrolação."
        />

        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LOYALTY.tiers.map((tier) => (
            <RevealItem
              key={tier.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-line bg-ink/60 p-7 transition-colors duration-500 hover:border-gold/50"
            >
              <div>
                <p className="eyebrow text-gold">{tier.points} pontos</p>
                <p className="display mt-4 text-2xl">{tier.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-bone-dim">
                  {tier.kind === "corte"
                    ? `Corte grátis de até ${formatBRL(tier.valueCents)} — você paga só o excedente.`
                    : `Desconto de ${formatBRL(tier.valueCents)} no seu próximo atendimento.`}
                </p>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-bone-dim/70">
                <Gift className="size-3.5 text-gold" /> resgate no balcão
              </span>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.1}>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-ink/60 p-7">
              <p className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold">
                <Users className="size-4" /> Indicação
              </p>
              <p className="mt-3 text-sm leading-relaxed text-bone-dim">
                Cada cliente recebe um código pessoal. Quem se cadastra com esse código ganha{" "}
                {LOYALTY.referralBonusPoints} pontos no primeiro corte — e quem indicou ganha
                outros {LOYALTY.referralBonusPoints}. Sem risco para o indicado.
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-ink/60 p-7">
              <p className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold">
                <Sparkles className="size-4" /> Como funciona
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-bone-dim">
                <li>1 ponto para cada R$ 1 gasto em atendimento.</li>
                <li>Os pontos entram na conta quando o corte é concluído.</li>
                <li>A recompensa é liberada automaticamente e usada no balcão.</li>
                <li>Quem é VIP (assinante do Clube) tem pontos em dobro.</li>
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
