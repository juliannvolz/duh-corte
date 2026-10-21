import { Star } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { getTestimonials } from "@/lib/content";

export async function Testimonials() {
  const testimonials = await getTestimonials();
  if (testimonials.length === 0) return null;

  return (
    <Section id="avaliacoes" className="py-24 md:py-36">
      <div className="shell">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Quem ja sentou"
            title="5,0 no Google"
            accent="com 123 avaliações."
            description="Avaliações reais de clientes da barbearia, coletadas do perfil do Google."
          />
          <Reveal delay={0.1}>
            <div className="flex items-center gap-4 rounded-2xl border border-line px-6 py-4">
              <span className="display text-4xl text-gold">5,0</span>
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-gold text-gold" />
                  ))}
                </div>
                <p className="mt-1 text-xs text-bone-dim">123 avaliações · Google</p>
              </div>
            </div>
          </Reveal>
        </div>

        <RevealGroup className="mt-14 grid gap-5 md:grid-cols-2">
          {testimonials.map((t) => (
            <RevealItem
              key={t.id}
              className="flex flex-col justify-between gap-8 rounded-3xl border border-line bg-ink-2 p-8"
            >
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-gold text-gold" />
                  ))}
                </div>
                <p className="mt-5 text-lg leading-relaxed text-bone">“{t.text}”</p>
              </div>
              <div className="flex items-center gap-4 border-t border-line pt-5">
                <span className="grid size-10 place-items-center rounded-full border border-gold/40 font-display text-sm text-gold">
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-medium">{t.author}</p>
                  <p className="text-xs text-bone-dim">Cliente verificado · {t.source}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}
