import Link from "next/link";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { getPlans } from "@/lib/content";
import { business, formatBRL } from "@/lib/site";

export async function Plans() {
  const plans = await getPlans();
  const pending = plans.some((p) => !p.priceConfirmed);

  return (
    <Section id="planos" tone="ink2" className="overflow-hidden py-24 md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(200,149,43,0.55), transparent 65%)" }}
      />

      <div className="shell relative">
        <SectionHeading
          eyebrow="Clube do assinante"
          title="Seu corte em dia,"
          accent="sem fila."
          description="Assinatura mensal com agenda prioritária, preço fixo e desconto nos produtos da casa. Escolha o plano e reserve a sua vaga."
        />

        {pending ? (
          <Reveal delay={0.12}>
            <p className="mt-6 text-xs text-gold/80">
              * Valores de referência do Clube — tabela oficial em validação com a barbearia.
            </p>
          </Reveal>
        ) : null}

        <RevealGroup className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <RevealItem
              key={plan.id}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-8 transition-colors duration-500 ${
                plan.highlight
                  ? "border-gold/50 bg-gradient-to-b from-gold/12 to-transparent"
                  : "border-line bg-ink/60 hover:border-line-strong"
              }`}
            >
              {plan.highlight ? (
                <span className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink">
                  <Sparkles className="size-3" /> Mais escolhido
                </span>
              ) : null}

              <div>
                <h3 className="display text-3xl">{plan.name}</h3>
                {plan.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-bone-dim">{plan.description}</p>
                ) : null}

                <p className="mt-8 flex items-baseline gap-2">
                  <span className="display text-5xl text-gold">{formatBRL(plan.priceCents)}</span>
                  <span className="text-sm text-bone-dim">/ {plan.period}</span>
                </p>

                <ul className="mt-8 space-y-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-3 text-sm text-bone">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 flex flex-col gap-3">
                <Link
                  href={`/agendar?plano=${plan.id}`}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all duration-300 ${
                    plan.highlight
                      ? "bg-gold text-ink hover:scale-[1.02]"
                      : "border border-line-strong text-bone hover:border-gold hover:text-gold"
                  }`}
                >
                  Quero este plano
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
                <p className="text-center text-xs text-bone-dim/70">
                  A assinatura e ativada na loja (Vila Nova), depois do primeiro corte.
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}
