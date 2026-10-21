import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { business } from "@/lib/site";
import { SmartImage } from "@/components/ui/SmartImage";

const pillars = [
  {
    title: "Hora marcada, sempre",
    text: "Nada de fila e nada de 'deixa eu ver'. Sua cadeira e sua — no horário que você escolheu.",
  },
  {
    title: "Cuidado no detalhe",
    text: "Degradê desenhado, simetria, barba na navalha e acabamento que dura o dia todo.",
  },
  {
    title: "Vila Nova de verdade",
    text: "Barbearia de bairro, com nome, história e gente que reconhece a cara na fila.",
  },
];

export function Story() {
  return (
    <Section id="sobre" className="py-24 md:py-36">
      <div className="shell grid gap-14 lg:grid-cols-12">
        <Reveal direction="right" className="lg:col-span-6">
          <figure className="relative">
            <div className="absolute -bottom-4 -left-4 size-32 border-b border-l border-gold/40" aria-hidden />
            <div className="relative aspect-4/3 overflow-hidden rounded-3xl border border-line bg-ink-2">
              <SmartImage
                name="nova-unidade"
                alt="A chave da nova unidade da Duh Corte Barbearia"
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="mt-4 text-xs uppercase tracking-[0.22em] text-bone-dim">
              Toda grande transformação começa com uma chave
            </figcaption>
          </figure>
        </Reveal>

        <div className="lg:col-span-6">
          <SectionHeading
            eyebrow="A casa"
            title="Uma barbearia"
            accent="com história."
            description={`A Duh Corte nasceu em ${business.address.neighborhood}, ${business.address.city}, e hoje prepara a nova unidade com o mesmo cuidado de sempre: cadeira, tempo e resultado.`}
          />

          <div className="mt-12 space-y-8">
            {pillars.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 0.08}>
                <div className="flex gap-5 border-t border-line pt-6">
                  <span className="font-display text-sm text-gold">0{i + 1}</span>
                  <div>
                    <h3 className="display text-xl">{pillar.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-bone-dim">{pillar.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.25}>
            <p className="mt-10 font-display text-lg text-gold">{business.hashtag}</p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
