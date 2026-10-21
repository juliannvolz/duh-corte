import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { getCategories, getServices } from "@/lib/content";
import { formatBRL } from "@/lib/site";

export async function Services() {
  const [categories, services] = await Promise.all([getCategories(), getServices()]);
  const pendingPrices = services.some((s) => !s.priceConfirmed);

  return (
    <Section id="servicos" className="py-24 md:py-36">
      <div className="shell">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Tabela de serviços"
            title="Corte, barba"
            accent="e sobra."
            description="Preços por serviço, com a duração real de cada atendimento. Escolha o combo e reserve em menos de um minuto."
          />
          <Reveal delay={0.1}>
            <Link
              href="/servicos"
              className="group inline-flex items-center gap-2 self-start border-b border-line-strong pb-1 text-sm text-bone transition-colors hover:border-gold hover:text-gold md:self-end"
            >
              Tabela completa
              <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Reveal>
        </div>

        {pendingPrices ? (
          <Reveal delay={0.15}>
            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-2 text-xs text-gold/90">
              <span className="size-1.5 animate-pulse rounded-full bg-gold" />
              Tabela em validação — valores finais confirmados com a barbearia
            </p>
          </Reveal>
        ) : null}

        <div className="mt-16 space-y-16">
          {categories.map((category, ci) => {
            const items = services.filter((s) => s.categoryId === category.id);
            if (items.length === 0) return null;
            return (
              <div key={category.id}>
                <Reveal>
                  <div className="flex items-baseline justify-between gap-6 border-b border-line pb-4">
                    <h3 className="display text-2xl md:text-3xl">
                      <span className="mr-3 text-gold/70">0{ci + 1}</span>
                      {category.name}
                    </h3>
                    <p className="hidden max-w-sm text-right text-sm text-bone-dim md:block">{category.blurb}</p>
                  </div>
                </Reveal>

                <RevealGroup className="mt-2">
                  <ul>
                    {items.map((service) => (
                      <RevealItem as="li" key={service.id} className="border-b border-line">
                        <Link
                          href={`/agendar?servico=${service.id}`}
                          className="card-hover group flex flex-col gap-3 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                        >
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className="display text-xl tracking-tight transition-colors duration-300 group-hover:text-gold md:text-2xl">
                                {service.name}
                              </h4>
                              {service.featured ? (
                                <span className="rounded-full border border-gold/40 px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-gold">
                                  Mais pedido
                                </span>
                              ) : null}
                            </div>
                            {service.description ? (
                              <p className="mt-2 max-w-xl text-sm leading-relaxed text-bone-dim">
                                {service.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-6 sm:shrink-0">
                            <span className="inline-flex items-center gap-1.5 text-xs text-bone-dim/80">
                              <Clock3 className="size-3.5" />
                              {service.durationMin} min
                            </span>
                            <span className="display min-w-24 text-right text-xl text-gold md:text-2xl">
                              {formatBRL(service.priceCents)}
                            </span>
                            <ArrowUpRight className="size-5 shrink-0 text-bone-dim transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-gold" />
                          </div>
                        </Link>
                      </RevealItem>
                    ))}
                  </ul>
                </RevealGroup>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
